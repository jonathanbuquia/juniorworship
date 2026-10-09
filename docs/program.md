# Program and song library

Open **Program** to show the Junior Worship welcome page immediately. There is
no customization panel or Start button. Existing saved program contents and song
files are preserved; presentation controls do not edit them.

The default flow is Welcome, Song 1, Opening Prayer, Song 2, Announcement,
Tithes and Offering, Memory Verse, Bible Books, Bible Lesson, Quiz, Closing Prayer.
Song 1 and Song 2 are placeholders until songs are assigned.

## Adding songs

The prepared song folder is:

`E:\SUNDAY SCHOOL\JUNIOR WORSHIP\Aquarium Songs`

Use one folder for each song:

```text
Aquarium Songs/
  Your Song Title/
    Your Song Title.mp3
    Lyrics/
      01.jpg
      02.jpg
      03.jpg
```

MP3, M4A, WAV and OGG audio, MP4/WebM video, and PNG/JPG/WebP lyric pictures
are supported. Keep one audio track per folder. Pictures use numeric filename
order. Empty template folders are ignored. Existing top-level audio and video
in `JUNIOR WORSHIP` are referenced without moving or changing them.

Keep folder names stable for songs already used by a saved program. Song setup
controls are not shown in this presentation-only view. Reopen Program to reload
the library after changing its files.

## Presenting

Use **Full screen** to enlarge the current page. **Back**, **Next**, and the part
dropdown remain inside fullscreen. Click the **X** or press Escape to return to
the smaller in-app view on exactly the same page. Entering/exiting fullscreen
does not recreate the presentation or restart a song or its lyric slide.

The selected part is remembered for this app session, including after visiting
an activity and returning through **Back to Program**. A fresh app session starts
with the welcome page. Existing song parts retain their **Play**, audio, and lyric
controls. Moving to another program part stops the previous song.

## Storage and tests

Back up both `local-data` and `Aquarium Songs`. Keep the original top-level media
as well if it is used in a program. No internet connection is needed.

Environment overrides for isolated tests or another installation:
`AQUARIUM_PROGRAM_DATA_DIR`, `AQUARIUM_SONGS_DIR`, `AQUARIUM_LEGACY_SONGS_DIR`.

Run `npm test` for persistence, media ranges and library checks. Run
`node tests/program-smoke.mjs` after building for UI/playback checks, with
`PLAYWRIGHT_MODULE` set if Playwright is outside project dependencies.
