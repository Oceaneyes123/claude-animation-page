"""Unit tests for Colab narration worker and CLI orchestrator."""

from __future__ import annotations

import contextlib
import csv
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch
from zipfile import ZipFile

import numpy as np
import soundfile as sf

SCRIPTS_DIR = Path(__file__).resolve().parent
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

import colab_narrate_worker  # noqa: E402
import render_narration_colab  # noqa: E402


class ColabWorkerTests(unittest.TestCase):
    def test_preview_then_full_render_reuses_batch_one(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            ref = root / "ref.wav"
            sf.write(ref, np.full(24000, 0.2, dtype=np.float32), 24000)

            plan_path = root / "plan.json"
            plan = {
                "model": "openbmb/VoxCPM2",
                "ref_text": "Halimbawa ng boses.",
                "seed": 12345,
                "num_step": 16,
                "guidance_scale": 2.0,
                "use_prompt_continuation": True,
                "trim_silence": True,
                "batches": [
                    {"index": 1, "text": "Unang pangungusap.", "est_seconds": 3.0},
                    {"index": 2, "text": "Ikalawang pangungusap.", "est_seconds": 3.0},
                ],
            }
            plan_path.write_text(json.dumps(plan), encoding="utf-8")

            out_dir = root / "out"
            model = Mock()
            model.tts_model.sample_rate = 48000
            # Include leading/trailing silence around speech to verify edge trim.
            clip = np.concatenate(
                [
                    np.zeros(24000, dtype=np.float32),
                    np.full(48000, 0.25, dtype=np.float32),
                    np.zeros(24000, dtype=np.float32),
                ]
            )
            model.generate.return_value = clip
            voxcpm_cls = SimpleNamespace(from_pretrained=Mock(return_value=model))
            torch_mod = SimpleNamespace(
                cuda=SimpleNamespace(is_available=lambda: True, get_device_name=lambda _: "NVIDIA L4"),
                manual_seed=Mock(),
            )

            sys.modules.pop(colab_narrate_worker._MODEL_CACHE_KEY, None)
            with (
                patch.dict(sys.modules, {"torch": torch_mod, "voxcpm": SimpleNamespace(VoxCPM=voxcpm_cls)}),
                contextlib.redirect_stdout(io.StringIO()),
            ):
                colab_narrate_worker.render(plan_path, ref, out_dir, preview=True)
                self.assertEqual(model.generate.call_count, 1)
                self.assertFalse((out_dir / "batches.zip").exists())
                preview_bytes = (out_dir / "batch_001.wav").read_bytes()

                colab_narrate_worker.render(plan_path, ref, out_dir, preview=False)
                self.assertEqual(model.generate.call_count, 2)
                self.assertEqual((out_dir / "batch_001.wav").read_bytes(), preview_bytes)

            voxcpm_cls.from_pretrained.assert_called_once_with(
                "openbmb/VoxCPM2", device="cuda", load_denoiser=False, optimize=False
            )
            kwargs = model.generate.call_args_list[0].kwargs
            self.assertEqual(kwargs["inference_timesteps"], 16)
            self.assertEqual(kwargs["cfg_value"], 2.0)
            self.assertEqual(kwargs["prompt_text"], "Halimbawa ng boses.")
            self.assertEqual(kwargs["prompt_wav_path"], str(ref))

            # Trimmed clip should be ~1.08s (1.0s speech + 0.04s pad on each side), not 2.0s.
            dur = sf.info(out_dir / "batch_001.wav").duration
            self.assertGreater(dur, 1.0)
            self.assertLess(dur, 1.2)

            with ZipFile(out_dir / "batches.zip") as archive:
                names = set(archive.namelist())
                self.assertEqual(names, {"batch_001.wav", "batch_002.wav", "worker_results.json", "narration-takes.csv"})
                rows = list(csv.DictReader(io.StringIO(archive.read("narration-takes.csv").decode("utf-8-sig"))))
                self.assertEqual(len(rows), 2)
                self.assertEqual(rows[0]["file"], "batch_001.wav")
                self.assertEqual(rows[1]["file"], "batch_002.wav")


class ColabOrchestratorTests(unittest.TestCase):
    def test_windows_to_wsl_path(self) -> None:
        self.assertEqual(
            render_narration_colab.to_wsl_path(Path(r"E:\Projects\Youtube\claude-animated\scripts\render.py")),
            "/mnt/e/Projects/Youtube/claude-animated/scripts/render.py",
        )

    def test_session_exists_exact_match(self) -> None:
        output = (
            "[narrate-v4-9] gpu-l4-s-usw4c0-1kng1i01mhg7c | Hardware: L4 | Shape: Standard\n"
            "  narrate-bolinao-123456   L4   RUNNING\n"
        )
        self.assertTrue(render_narration_colab._session_exists(output, "narrate-v4-9"))
        self.assertTrue(render_narration_colab._session_exists(output, "narrate-bolinao-123456"))
        self.assertFalse(render_narration_colab._session_exists(output, "narrate-bolinao"))
        self.assertFalse(render_narration_colab._session_exists(output, "narrate-v4"))

    def test_parse_script_text_extracts_voiceover_and_hakbang2(self) -> None:
        root = Path(__file__).resolve().parents[1]
        video3 = render_narration_colab.parse_script_text(
            (root / "shorts/03-lapaz/SCRIPT.md").read_text(encoding="utf-8-sig")
        )
        self.assertTrue(video3.startswith("Bakit nga ba may malawak na disyerto"))
        self.assertNotIn("Facts:", video3)

        bolinao_path = root / "shorts/04-bolinao/SCRIPT.md"
        bolinao = render_narration_colab.parse_script_text(bolinao_path.read_text(encoding="utf-8-sig"))
        self.assertTrue(bolinao.startswith("Bakit nga ba may gintong kaliskis"))
        self.assertNotIn("Hakbang 1", bolinao)
        self.assertNotIn("Preview ng mga visual", bolinao)

        v10 = render_narration_colab.parse_script_text(
            (root / "shorts/10-asin-tibuok/SCRIPT.md").read_text(encoding="utf-8-sig")
        )
        self.assertTrue(v10.startswith("Bakit nga ba, parang itlog ang asin na"))
        self.assertNotIn("Makikita sa cartoon", v10)
        self.assertNotIn("Mga sanggunian", v10)

        v15 = render_narration_colab.parse_script_text(
            (root / "shorts/15-pampanga-parol/SCRIPT.md").read_text(encoding="utf-8-sig")
        )
        self.assertTrue(v15.startswith("Bakit nga ba, sumasabay sa tugtog"))
        self.assertNotIn("Makikita sa cartoon", v15)
        self.assertNotIn("Mga sanggunian", v15)

    def test_parse_usage_info_extracts_balance_rate_and_active(self) -> None:
        sample = (
            "Current balance: 196.50 compute units\n"
            "Usage rate: 2.35/hr\n"
            "Active assignments: 1\n"
        )
        info = render_narration_colab.parse_usage_info(sample)
        self.assertEqual(info["balance"], 196.50)
        self.assertEqual(info["usage_rate"], 2.35)
        self.assertEqual(info["active_assignments"], 1)

    def test_colab_run_logs_and_records_compute_units_used(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            script = root / "SCRIPT.md"
            script.write_text("Voiceover:\nUnang pangungusap lamang ito.", encoding="utf-8")
            ref = root / "ref.wav"
            sf.write(ref, np.full(24000, 0.2, dtype=np.float32), 24000)
            out_wav = root / "narration.wav"
            batches_dir = root / "narration_batches"

            fake_cli = Mock()
            fake_cli.usage.side_effect = [
                "Current balance: 196.50 compute units\nUsage rate: 0.00/hr\nActive assignments: 0\n",
                "Current balance: 196.18 compute units\nUsage rate: 0.00/hr\nActive assignments: 0\n",
            ]
            fake_cli.sessions.return_value = "[colab] No active sessions found on server.\n"
            fake_cli.exec_code.return_value = "COLAB_DEPS_OK 2.0.3\n"

            def fake_download(_session: str, remote_path: str, local_path: Path) -> None:
                self.assertTrue(remote_path.startswith("/content/"))
                local_path.parent.mkdir(parents=True, exist_ok=True)
                if remote_path.endswith("batch_001.wav"):
                    sf.write(local_path, np.full(48000, 0.2, dtype=np.float32), 48000)
                elif remote_path.endswith("worker_results.json"):
                    local_path.write_text(
                        json.dumps(
                            {
                                "results": [
                                    {
                                        "index": 1,
                                        "filename": "batch_001.wav",
                                        "actual_seconds": 1.0,
                                        "sample_rate": 48000,
                                        "channels": 1,
                                        "gen_time_s": 2.5,
                                    }
                                ]
                            }
                        ),
                        encoding="utf-8",
                    )

            fake_cli.download.side_effect = fake_download

            buf = io.StringIO()
            with (
                patch.object(render_narration_colab, "ColabCLI", return_value=fake_cli),
                contextlib.redirect_stdout(buf),
            ):
                rc = render_narration_colab.main(
                    [
                        str(script),
                        "--ref-audio",
                        str(ref),
                        "-o",
                        str(out_wav),
                        "--batches-dir",
                        str(batches_dir),
                        "--min-seconds",
                        "1",
                        "--target-seconds",
                        "2",
                        "--max-seconds",
                        "10",
                        "--preview",
                    ]
                )
            self.assertEqual(rc, 0)
            output_text = buf.getvalue()
            self.assertIn("Compute units used by this run: 0.32 (balance: 196.50 -> 196.18", output_text)
            manifest = json.loads((batches_dir / "manifest.json").read_text(encoding="utf-8"))
            self.assertEqual(
                manifest["compute_units"],
                {"balance_before": 196.5, "balance_after": 196.18, "used": 0.32},
            )

    def test_provision_session_fast_fallback_on_503(self) -> None:
        fake_cli = Mock()
        fake_cli.sessions.return_value = "[colab] No active sessions found on server.\n"
        fake_cli.new.side_effect = [RuntimeError("503 Service Unavailable"), None]

        created = render_narration_colab._provision_session(
            fake_cli, "test-sess", gpu="L4", fallback_gpu="T4", high_mem=False, reuse=False
        )
        self.assertTrue(created)
        self.assertEqual(fake_cli.new.call_count, 2)
        self.assertEqual(fake_cli.new.call_args_list[0].kwargs["gpu"], "L4")
        self.assertEqual(fake_cli.new.call_args_list[0].kwargs["assign_retries"], 0)
        self.assertEqual(fake_cli.new.call_args_list[1].kwargs["gpu"], "T4")

    def test_multi_script_run_shares_session_and_uploads_worker_once(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            v1_dir = root / "v1"
            v2_dir = root / "v2"
            v1_dir.mkdir()
            v2_dir.mkdir()
            s1 = v1_dir / "SCRIPT.md"
            s2 = v2_dir / "SCRIPT.md"
            s1.write_text("Voiceover:\nUnang video.", encoding="utf-8")
            s2.write_text("Voiceover:\nIkalawang video.", encoding="utf-8")
            ref = root / "ref.wav"
            sf.write(ref, np.full(24000, 0.2, dtype=np.float32), 24000)

            fake_cli = Mock()
            fake_cli.usage.side_effect = [
                "Current balance: 195.91 compute units\nUsage rate: 0.00/hr\nActive assignments: 0\n",
                "Current balance: 195.60 compute units\nUsage rate: 0.00/hr\nActive assignments: 0\n",
            ]
            fake_cli.sessions.return_value = "[colab] No active sessions found on server.\n"
            fake_cli.exec_code.return_value = "COLAB_DEPS_OK 2.0.3\n"

            def fake_download(_session: str, remote_path: str, local_path: Path) -> None:
                local_path.parent.mkdir(parents=True, exist_ok=True)
                with ZipFile(local_path, "w") as archive:
                    wav_tmp = local_path.with_suffix(".wav")
                    sf.write(wav_tmp, np.full(48000, 0.2, dtype=np.float32), 48000)
                    archive.write(wav_tmp, "batch_001.wav")
                    wav_tmp.unlink()
                    archive.writestr(
                        "worker_results.json",
                        json.dumps(
                            {
                                "results": [
                                    {
                                        "index": 1,
                                        "filename": "batch_001.wav",
                                        "actual_seconds": 1.0,
                                        "sample_rate": 48000,
                                        "channels": 1,
                                        "gen_time_s": 1.5,
                                    }
                                ]
                            }
                        ),
                    )

            fake_cli.download.side_effect = fake_download

            with (
                patch.object(render_narration_colab, "ColabCLI", return_value=fake_cli),
                contextlib.redirect_stdout(io.StringIO()),
            ):
                rc = render_narration_colab.main(
                    [
                        str(s1),
                        str(s2),
                        "--ref-audio",
                        str(ref),
                        "--min-seconds",
                        "1",
                        "--target-seconds",
                        "2",
                        "--max-seconds",
                        "10",
                    ]
                )

            self.assertEqual(rc, 0)
            self.assertEqual(fake_cli.new.call_count, 1)
            self.assertEqual(fake_cli.stop.call_count, 1)
            # Worker + ref uploaded once, plus one plan.json per script = 4 uploads total.
            self.assertEqual(fake_cli.upload.call_count, 4)
            self.assertTrue((v1_dir / "narration.wav").is_file())
            self.assertTrue((v2_dir / "narration.wav").is_file())
            m2 = json.loads((v2_dir / "narration_batches" / "manifest.json").read_text(encoding="utf-8"))
            self.assertEqual(m2["compute_units"]["scope"], "batch_run (2 videos)")
            self.assertEqual(m2["compute_units"]["used"], 0.31)


if __name__ == "__main__":
    unittest.main()
