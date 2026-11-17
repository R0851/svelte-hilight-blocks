# Svelte Hilight Blocks

Highlights `<script>`, `<script module>`, and `<style>` blocks in `.svelte` files
 - customizable background colors
 - supports OKLCH, hex, RGB, and HSL color strings via `@hueycolor/core`


## Features

* **Distinct Block Highlighting:** Automatically applies customizable full-width background tints to `<script>`, `<script module>`, and `<style>` blocks in `.svelte` files, leaving HTML markup untouched so component sections are easy to distinguish at a glance.

* **Modern Color Support (OKLCH & More):** Powered by [hueycolor](https://hueycolor.pages.dev/), settings accept `oklch(...)` strings alongside standard hex, RGB, and HSL formats, converting them into VS Code-compatible colors with safe fallbacks while editing.

* **Preserves Active Cursor Line Highlights:** Dynamically excludes any line containing a cursor or active selection (including multi-cursor edits) before rendering block decorations, ensuring VS Code's `editor.lineHighlightBackground` remains completely unobstructed on the lines you are editing.

* **Non-Intrusive Visual Indicators:** Uses clean whole-line background shading and overview ruler scrollbar markers.

* **Accurate Svelte AST Parsing with Version Caching:** Uses `svelte/compiler` to locate exact block boundaries rather than fragile regular expressions, avoiding false matches inside comments or strings. Parsed ranges are cached per document in a `WeakMap` keyed to `document.version`, so moving the cursor around reuses cached ranges without re-parsing the file until the text actually changes.


## Settings

* `svelteHilightBlocks.instanceScriptBackground`:  
  background color for instance `<script>` blocks in Svelte files

* `svelteHilightBlocks.moduleScriptBackground`:  
  background color for module `<script>` blocks in Svelte files

* `svelteHilightBlocks.styleBackground`:  
  background color for `<style>` blocks in Svelte files

* `svelteHilightBlocks.backgroundOpacity`:  
  background opacity for affected blocks

* `svelteHilightBlocks.overviewLaneOpacity`:  
  opacity of the overview lane marker
