# Heartifacts Riot web font

The website is prepared to use the band's **Heartifacts Riot** typeface for display typography only.

Expected local file:

```text
assets/fonts/HeartifactsRiot-Regular.ttf
```

The CSS uses `font-display: swap` and falls back safely if the font file has not been copied into the repository yet.

## Where Riot should be used

Use it for high-impact identity moments such as:

- the Heartifacts name;
- hero display text;
- release/song titles;
- large social labels;
- stickers and short callouts;
- selected live-show display text.

Do **not** use Riot for paragraphs, navigation metadata, long descriptions or other dense reading text.

## Romanian text

The current supplied font build does not include the full Romanian diacritic set (`Ă ă Â â Î î Ș ș Ț ț`). For that reason, long bilingual section headings currently use a separate readable display stack rather than forcing mixed-font letters into Romanian text.

If a future official Heartifacts Riot build gains complete Romanian glyph coverage, we can safely expand its use across translated headings.

## Asset ownership

Only commit a font file that the band has the right to distribute publicly through this repository. The repository should not contain unrelated or unlicensed commercial fonts.
