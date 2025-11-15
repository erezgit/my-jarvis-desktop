#!/usr/bin/env python3
"""
Transcribe Hebrew audio segments 4-7 using OpenAI Whisper API (updated for openai>=1.0.0)
"""
import os
from datetime import datetime
from openai import OpenAI

# Initialize OpenAI client
client = OpenAI(
    api_key="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"
)

def transcribe_audio_segment(audio_file_path, segment_number):
    """Transcribe a single audio segment using OpenAI Whisper"""
    try:
        print(f"Transcribing segment {segment_number}: {audio_file_path}")

        with open(audio_file_path, "rb") as audio_file:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language="he"  # Hebrew language code
            )

        # Generate timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        # Create output filename
        filename = os.path.basename(audio_file_path)
        output_file = f"segment_{segment_number}_transcript_{timestamp}.txt"

        # Format content with header
        content = f"=== SEGMENT {segment_number} ({filename}) ===\n\n{transcript.text}\n"

        # Save transcript
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(content)

        print(f"✓ Segment {segment_number} transcribed: {len(transcript.text)} characters")
        print(f"  Saved to: {output_file}")

        return {
            'segment': segment_number,
            'filename': filename,
            'output_file': output_file,
            'character_count': len(transcript.text),
            'success': True
        }

    except Exception as e:
        print(f"✗ Error transcribing segment {segment_number}: {str(e)}")
        return {
            'segment': segment_number,
            'filename': os.path.basename(audio_file_path) if audio_file_path else 'unknown',
            'output_file': None,
            'character_count': 0,
            'success': False,
            'error': str(e)
        }

def main():
    """Main transcription function for segments 4-7"""
    # Define segments to transcribe (4-7 correspond to part_003-006)
    segments_to_transcribe = [
        (4, "yaron-meeting-01_part_003.m4a"),
        (5, "yaron-meeting-01_part_004.m4a"),
        (6, "yaron-meeting-01_part_005.m4a"),
        (7, "yaron-meeting-01_part_006.m4a")
    ]

    results = []
    total_characters = 0
    errors = []

    print("Starting Hebrew audio transcription for segments 4-7...")
    print("=" * 60)

    for segment_num, audio_file in segments_to_transcribe:
        if not os.path.exists(audio_file):
            error_msg = f"Audio file not found: {audio_file}"
            print(f"✗ {error_msg}")
            errors.append(error_msg)
            results.append({
                'segment': segment_num,
                'filename': audio_file,
                'success': False,
                'error': error_msg
            })
            continue

        result = transcribe_audio_segment(audio_file, segment_num)
        results.append(result)

        if result['success']:
            total_characters += result['character_count']
        else:
            errors.append(f"Segment {segment_num}: {result.get('error', 'Unknown error')}")

    # Print summary
    print("\n" + "=" * 60)
    print("TRANSCRIPTION SUMMARY")
    print("=" * 60)

    successful_segments = [r for r in results if r['success']]
    failed_segments = [r for r in results if not r['success']]

    print(f"Successfully transcribed: {len(successful_segments)}/4 segments")
    print(f"Total characters transcribed: {total_characters:,}")

    if successful_segments:
        print("\nSuccessful transcriptions:")
        for result in successful_segments:
            print(f"  • Segment {result['segment']}: {result['character_count']:,} chars → {result['output_file']}")

    if failed_segments:
        print(f"\nFailed transcriptions: {len(failed_segments)}")
        for result in failed_segments:
            print(f"  • Segment {result['segment']}: {result.get('error', 'Unknown error')}")

    if errors:
        print(f"\nErrors encountered: {len(errors)}")
        for error in errors:
            print(f"  • {error}")

    return results

if __name__ == "__main__":
    main()
