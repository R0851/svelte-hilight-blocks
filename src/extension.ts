/*
 * Svelte Hilight Blocks
 * Copyright (C) 2026 Robert Silvis
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://gnu.org>.
 */


import * as vscode from 'vscode';
import { hueyColor } from '@hueycolor/core';
import { parse } from 'svelte/compiler';

const DEFAULT_BG = '#000080';
const DEFAULT_OPACITY = 0.125;
const DEFAULT_LANE_OPACITY = 0.65;

function create_styles (): Record<string, vscode.TextEditorDecorationType> {
  const config = vscode.workspace.getConfiguration("svelteHilightBlocks");
  const instance_script_bg_cfg = config.get<string>('instanceScriptBackground', DEFAULT_BG).trim() || DEFAULT_BG;
  const module_script_bg_cfg = config.get<string>('moduleScriptBackground', DEFAULT_BG).trim() || DEFAULT_BG;
  const style_bg_cfg = config.get<string>('styleBackground', DEFAULT_BG).trim() || DEFAULT_BG;
  const bg_opacity_cfg = config.get<number>('backgroundOpacity', DEFAULT_OPACITY) || DEFAULT_OPACITY;
  const lane_opacity_cfg = config.get<number>('overviewLaneOpacity', DEFAULT_LANE_OPACITY) || DEFAULT_LANE_OPACITY;
  let instance_script_bg = DEFAULT_BG;
  let module_script_bg = DEFAULT_BG;
  let style_bg = DEFAULT_BG;
  let instance_script_lane = DEFAULT_BG;
  let module_script_lane = DEFAULT_BG;
  let style_lane = DEFAULT_BG;
  try {
    instance_script_bg = hueyColor(instance_script_bg_cfg).setAlpha(bg_opacity_cfg).toHexString();
    module_script_bg = hueyColor(module_script_bg_cfg).setAlpha(bg_opacity_cfg).toHexString();
    style_bg = hueyColor(style_bg_cfg).setAlpha(bg_opacity_cfg).toHexString();
    instance_script_lane = hueyColor(instance_script_bg_cfg).setAlpha(lane_opacity_cfg).toHexString();
    module_script_lane = hueyColor(module_script_bg_cfg).setAlpha(lane_opacity_cfg).toHexString();
    style_lane = hueyColor(style_bg_cfg).setAlpha(lane_opacity_cfg).toHexString();
  } catch {
  }

  return {
    "instance_script": vscode.window.createTextEditorDecorationType({
      isWholeLine: true,
      backgroundColor: instance_script_bg,
      overviewRulerColor: instance_script_lane,
      overviewRulerLane: vscode.OverviewRulerLane.Full,
      before: {
        contentText: "",
        margin: "0 -1000px 0 0",
        width: "1000px",
        backgroundColor: instance_script_bg
      },
      after: {
        contentText: "",
        margin: "0 0 0 -1000px",
        width: "1000px",
        backgroundColor: instance_script_bg
      }
    }),
    "module_script": vscode.window.createTextEditorDecorationType({
      isWholeLine: true,
      backgroundColor: module_script_bg,
      overviewRulerColor: module_script_lane,
      overviewRulerLane: vscode.OverviewRulerLane.Full,
      before: {
        contentText: "",
        margin: "0 -1000px 0 0",
        width: "1000px",
        backgroundColor: module_script_bg
      },
      after: {
        contentText: "",
        margin: "0 0 0 -1000px",
        width: "1000px",
        backgroundColor: module_script_bg
      }
    }),
    "style": vscode.window.createTextEditorDecorationType({
      isWholeLine: true,
      backgroundColor: style_bg,
      overviewRulerColor: style_lane,
      overviewRulerLane: vscode.OverviewRulerLane.Full,
      before: {
        contentText: "",
        margin: "0 -1000px 0 0",
        width: "1000px",
        backgroundColor: style_bg
      },
      after: {
        contentText: "",
        margin: "0 0 0 -1000px",
        width: "1000px",
        backgroundColor: style_bg
      }
    })
  };
}


function exclude_current_lines (
  document: vscode.TextDocument,
  ranges: vscode.Range[],
  selections: readonly vscode.Selection[]
): vscode.Range[] {
  // Collect all line numbers that currently have a cursor (supports multi-cursor)
  const cursorLines = new Set<number>();
  for (const sel of selections) {
    for (let line = sel.start.line; line <= sel.end.line; line++) {
      cursorLines.add(line);
    }
  }

  const result: vscode.Range[] = [];

  for (const range of ranges) {
    let segmentStart: number | null = null;

    for (let line = range.start.line; line <= range.end.line; line++) {
      if (cursorLines.has(line)) {
        // Close out the current highlighted segment right above the cursor line
        if (segmentStart !== null) {
          result.push(
            new vscode.Range(
              new vscode.Position(segmentStart, 0),
              document.lineAt(line - 1).range.end
            )
          );
          segmentStart = null;
        }
      } else if (segmentStart === null) {
        segmentStart = line;
      }
    }

    // Close out any remaining segment after the last cursor line
    if (segmentStart !== null) {
      result.push(
        new vscode.Range(
          new vscode.Position(segmentStart, 0),
          document.lineAt(range.end.line).range.end
        )
      );
    }
  }

  return result;
}


type Ranges = Record<string, vscode.Range[]>;
const range_cache = new WeakMap<vscode.TextDocument, {version: number; ranges: Ranges}>();

function get_ranges (document: vscode.TextDocument): Ranges {
  const cached = range_cache.get(document);
  if (cached && cached.version === document.version) {
    return cached.ranges;
  }

  const text = document.getText();
  const ast = parse(text, {modern: true});
  const to_range = (node: { start: number; end: number } | null) =>
    node? [new vscode.Range(document.positionAt(node.start), document.positionAt(node.end))] : [];

  const ranges = {
    "instance_script": to_range(ast.instance),
    "module_script": to_range(ast.module),
    "style": to_range(ast.css)
  };
  range_cache.set(document, {version: document.version, ranges});
  return ranges;
}


export function activate (context: vscode.ExtensionContext) {
  let debounceTimer: NodeJS.Timeout | undefined;
  let styles = create_styles();

  function apply_styles (editor: vscode.TextEditor | undefined) {
    if (!editor || editor.document.languageId !== 'svelte') {
      return;
    }

    try {
      const ranges = get_ranges(editor.document);
      for (const key of Object.keys(styles) as Array<keyof typeof styles>) {
        const visibleRanges = exclude_current_lines(
          editor.document,
          ranges[key],
          editor.selections
        );
        editor.setDecorations(styles[key], visibleRanges);
      }
    } catch {
      // ignore syntax errors while editing to prevent flickering
    }
  }

  function schedule_update (editor: vscode.TextEditor | undefined) {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => apply_styles(editor), 250);
  }

  function dispose_styles () {
    for (const style of Object.values(styles)) {
      style.dispose();
    }
  }

  // apply immediately to any already-open Svelte editors on activation
  for (const editor of vscode.window.visibleTextEditors) {
    apply_styles(editor);
  }

  const handle_activeEditor = vscode.window.onDidChangeActiveTextEditor((editor) => {
    apply_styles(editor);
  });

  const handle_textChange = vscode.workspace.onDidChangeTextDocument((event) => {
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor && event.document === activeEditor.document) {
      schedule_update(activeEditor);
    }
  });

  const handle_configChange = vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration("svelteHilightBlocks")) {
      dispose_styles();
      styles = create_styles();
      for (const editor of vscode.window.visibleTextEditors) {
        apply_styles(editor);
      }
    }
  });

  const handle_selectionChange = vscode.window.onDidChangeTextEditorSelection((event) => {
    if (event.textEditor.document.languageId === 'svelte') {
      apply_styles(event.textEditor);
    }
  });

  context.subscriptions.push(
    handle_activeEditor,
    handle_textChange,
    handle_configChange,
    handle_selectionChange,
    {dispose: dispose_styles}
  );
}

export function deactivate () {}
