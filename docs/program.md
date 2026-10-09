# Program and song library

Open **Program** to show the Junior Worship welcome page immediately. There is
no customization panel or Start button. Existing song files are preserved.

The default flow is Welcome, Song 1, Opening Prayer, Song 2, Announcement,
Tithes and Offering, Memory Verse, Bible Books, Bible Lesson, Quiz, Closing Prayer.
Song 1 and Song 2 each have a searchable song selector. Their choices save
independently to the local program file. Selecting a song shows its available
lyrics but never starts playback; press **Play** to start the music.

## Adding songs

The only song source is:

`E:\SUNDAY SCHOOL\JUNIOR WORSHIP\BIBLE TRUTH KIDS SONGS`

Keep the audio files directly in this folder, with matched lyrics underneath:

```text
BIBLE TRUTH KIDS SONGS/
  SONG TITLE.mp3
  Lyrics/
    SONG TITLE/
      01.jpg
      02.jpg
      03.jpg
```

MP3, M4A, WAV and OGG audio and PNG/JPG/WebP lyric pictures are supported.
Pictures use numeric filename order. Videos, nested audio, Aquarium Songs, and
tracks elsewhere in JUNIOR WORSHIP are excluded. No files are moved or deleted.

Keep those MP3s in place. For each song, put its verified lyric text in
`Lyrics/SONG TITLE.txt` inside that folder, or numbered lyric pictures in
`Lyrics/SONG TITLE/`. The title must match the MP3 filename without its extension.
Use UTF-8 for text and blank lines between verses/pages. Text is projected in
short pages, preserving the supplied words, order, and repeats. Pictures take
priority when both formats exist. No lyric transcription or automatic timing
is performed. Songs without verified lyrics are labeled **Lyrics pending**.

Click **Refresh songs** in either song section after adding lyrics. Keep folder
and track names stable for songs already selected in a program.

## Presenting

Use **Full screen** to enlarge the current page. **Back**, **Next**, and the part
dropdown remain inside fullscreen. Click the **X** or press Escape to return to
the smaller in-app view on exactly the same page. Entering/exiting fullscreen
does not recreate the presentation or restart a song or its lyric slide. Use
**Previous lyric** and **Next lyric** to change lyrics while the music continues.
Selecting a different song stops the previous one and waits for **Play** again.

The selected part is remembered for this app session, including after visiting
an activity and returning through **Back to Program**. A fresh app session starts
with the welcome page. Existing song parts retain their **Play**, audio, and lyric
controls. Moving to another program part stops the previous song.

## Storage and tests

Back up both `local-data` and `BIBLE TRUTH KIDS SONGS`, including its Lyrics
folder. No internet connection is needed.

Environment overrides for isolated tests or another installation:
`AQUARIUM_PROGRAM_DATA_DIR`, `AQUARIUM_SONGS_DIR`, `AQUARIUM_LEGACY_SONGS_DIR`.

Run `npm test` for persistence, media ranges and library checks. Run
`node tests/program-smoke.mjs` after building for UI/playback checks, with
`PLAYWRIGHT_MODULE` set if Playwright is outside project dependencies.
