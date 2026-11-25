# Builds and masters BolinaoShort (shorts/04-bolinao) music + SFX + voice mix to -15.0 LUFS / <= -1.2 dBTP.
import os
import sys
import numpy as np

AUDIO_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(AUDIO_DIR)))
sys.path.insert(0, AUDIO_DIR)
sys.path.insert(0, os.path.join(ROOT, "scripts", "audio"))

from dsp import SR, dbg, read_wav, write_wav, integrated, true_peak, momentary_max, st, lp
import music
import sfx

VOICE_PATH = os.path.join(ROOT, "public", "bolinao", "voice.wav")
OUT_MIX = os.path.join(ROOT, "public", "bolinao", "mix.wav")


def speech_envelope(mono_voice):
    """Smooth speech activity ducking curve (0 = pause, 1 = active speech) with fast attack & 240 ms release."""
    from scipy.ndimage import maximum_filter1d
    rect = np.abs(mono_voice)
    win_att = int(0.025 * SR)
    fast = np.convolve(rect, np.ones(win_att) / win_att, mode="same")
    # Vectorized 240 ms hold + smooth LP release (zero Python sample loops)
    held = maximum_filter1d(fast, size=int(0.24 * SR))
    env = np.convolve(held, np.ones(int(0.08 * SR)) / int(0.08 * SR), mode="same")
    ref = max(float(np.sqrt(np.mean(mono_voice ** 2))), 1e-6)
    gate = np.clip((env / ref - 0.14) / 0.35, 0.0, 1.0)
    return gate[None, :]


def main():
    voice_raw, sr = read_wav(VOICE_PATH)
    assert sr == SR, f"Expected {SR} Hz voice, got {sr}"
    voice_mono = voice_raw[0] if voice_raw.ndim == 2 else voice_raw
    N = len(voice_mono)
    dur = N / SR
    voice_st = st(voice_mono)

    print(f"Loaded voice.wav: {dur:.6f}s ({N} samples), LUFS={integrated(voice_st):.2f}")

    mus = music.build(dur=dur, seed=404)[:, :N]
    fx = sfx.build(dur=dur, seed=405)[:, :N]

    # Gentle transient taming on SFX only so individual hammer hits don't push ambience/digging too low
    fx_pre_pk = max(float(np.max(np.abs(fx))), 1e-6)
    fx_tamed = np.tanh(fx / (fx_pre_pk * 0.45)) * (fx_pre_pk * 0.45)

    # Calibrate Music and SFX relative to Voice LUFS (gain-only voice purity!)
    v_lufs = integrated(voice_st)
    mus_lufs = integrated(mus)
    fx_lufs = integrated(fx_tamed)

    # Target: music rich and clearly audible (~ -8.6 dB under voice integrated, ducked softly on speech)
    mus_base_gain = dbg((v_lufs - 7.4) - mus_lufs) if np.isfinite(mus_lufs) else 1.0
    mus_scaled = mus * mus_base_gain
    gate = speech_envelope(voice_mono)
    duck = 1.0 - 0.30 * gate  # ~ -3.1 dB duck during spoken words, full bloom between sentences
    mus_ducked = mus_scaled * duck

    # Target: SFX clearly present (~ -7.8 dB under voice integrated) with transient peak safety
    fx_gain = dbg((v_lufs - 7.8) - fx_lufs) if np.isfinite(fx_lufs) else 1.0
    fx_scaled = fx_tamed * fx_gain

    # Master bus: gain-only voice + softly peak-guarded accompaniment bed (voice remains 100% linear)
    bed = mus_ducked + fx_scaled
    raw_mix = voice_st + bed
    mix_lufs = integrated(raw_mix)
    trim = dbg(-15.0 - mix_lufs)

    # Check true peak: if voice+bed momentarily exceeds -1.3 dBTP, duck ONLY the bed at peak spikes (never distort voice!)
    v_out = voice_st * trim
    bed_out = bed * trim
    final_mix = v_out + bed_out
    tp = true_peak(final_mix)
    if tp > -1.3:
        overshoot = np.maximum(np.abs(final_mix) - dbg(-1.35), 0.0)
        sign_bed = np.sign(bed_out)
        bed_out = bed_out - sign_bed * np.minimum(np.abs(bed_out), overshoot.max(axis=0, keepdims=True) * 1.1)
        final_mix = v_out + bed_out

    # Ensure exact voice sample count & clean tail fade (20 ms)
    tail = int(0.02 * SR)
    final_mix[:, -tail:] *= np.linspace(1.0, 0.0, tail)[None, :]

    # Write stems + final 16-bit PCM WAV (universally playable across Chromium & ffmpeg)
    write_wav(os.path.join(AUDIO_DIR, "stem_voice.wav"), v_out, bits=16)
    write_wav(os.path.join(AUDIO_DIR, "stem_music.wav"), mus_ducked * trim, bits=16)
    write_wav(os.path.join(AUDIO_DIR, "stem_sfx.wav"), fx_scaled * trim, bits=16)
    write_wav(OUT_MIX, final_mix, bits=16)

    print(
        f"Mastered {OUT_MIX}\n"
        f"  Voice stem LUFS : {integrated(v_out):.2f}\n"
        f"  Music stem LUFS : {integrated(mus_ducked * trim):.2f}\n"
        f"  SFX stem LUFS   : {integrated(fx_scaled * trim):.2f} (mom_max={momentary_max(fx_scaled * trim):.2f})\n"
        f"  Final Mix LUFS  : {integrated(final_mix):.2f}\n"
        f"  True Peak       : {true_peak(final_mix):.2f} dBTP"
    )


if __name__ == "__main__":
    main()
