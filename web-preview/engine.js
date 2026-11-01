(function (root) {
  "use strict";
  const Guides =
    root.PrintableGuides || (typeof require === "function" ? require("./printable-guides.js") : null);
  const MathV = root.MathVertical || (typeof require === "function" ? require("./math-vertical.js") : null);
  const P = root.PracticeTools || (typeof require === "function" ? require("./practice-tools.js") : null);
  const D = root.WorkbookData,
    MM = 3.78,
    WIDTH = 791.8,
    HEIGHT = 1118.66;
  const cnTypes = ["hanzi", "cizu", "duanluo", "bihua"];
  const fontString = (s) =>
    `${s.fontWeight === "bold" ? "700" : "400"} ${(s.size * MM * s.scale) / 100}px ${D.fonts[s.font]?.family || D.fonts.kaiti.family}`;
  function geometry(type, s) {
    const size = s.size * MM,
      gap = s.rowGap * MM;
    const bishun = type === "hanzi" && s.showBishun ? Math.floor(size * 0.6) : 0;
    const pinyin = ["hanzi", "cizu"].includes(type) && s.showPinyin ? Math.floor(size * 0.6) : 0;
    const rowHeight = size + bishun + pinyin;
    const modeHeader =
      (s.englishMode && s.englishMode !== "copy") || (s.practiceMode && s.practiceMode !== "trace") ? 22 : 0;
    const header = modeHeader + (s.showHeader ? 56 : 0);
    const availableWidth = WIDTH - s.padding[1] - s.padding[3],
      availableHeight = HEIGHT - s.padding[0] - s.padding[2] - header;
    const unit = type === "alphabet" ? Math.floor(size * 1.75) : size;
    const cols = Math.max(1, Math.floor(availableWidth / unit));
    const continuous =
      ["word", "paragraph", "pinyin", "number"].includes(type) ||
      (type === "duanluo" && s.cellType === "hxg");
    const width = continuous ? availableWidth : cols * unit;
    const rows = Math.max(1, Math.floor((availableHeight + gap) / (rowHeight + gap)));
    return {
      header,
      modeHeader,
      size,
      gap,
      unit,
      bishun,
      pinyin,
      rowHeight,
      cols,
      rows,
      width,
      x: Math.floor(s.padding[3] + (availableWidth - width) / 2),
      y: Math.floor(s.padding[0] + header + (availableHeight - (rowHeight + gap) * rows + gap) / 2),
    };
  }
  function breakText(text, maxWidth, measure, spacing = 0) {
    const result = [];
    for (const paragraph of text.replace(/\u00a0/g, " ").split("\n")) {
      if (!paragraph) {
        result.push("");
        continue;
      }
      let current = "";
      for (const char of Array.from(paragraph)) {
        const next = current + char;
        if (current && measure(next) + (Array.from(next).length - 1) * spacing > maxWidth) {
          result.push(current);
          current = char;
        } else current = next;
      }
      result.push(current);
    }
    return result;
  }
  function englishLines(text, maxWidth, measure) {
    const result = [];
    for (const paragraph of text.replace(/\u00a0/g, " ").split("\n")) {
      if (!paragraph.trim()) {
        result.push("");
        continue;
      }
      let line = "";
      for (const word of paragraph.trim().split(/\s+/)) {
        const next = line ? line + " " + word : word;
        if (measure(next) <= maxWidth) {
          line = next;
          continue;
        }
        if (line) {
          result.push(line);
          line = "";
        }
        if (measure(word) > maxWidth) {
          const parts = breakText(word, maxWidth, measure);
          result.push(...parts.slice(0, -1));
          line = parts.at(-1);
        } else line = word;
      }
      if (line) result.push(line);
    }
    return result;
  }
  function chineseGridLines(text, cols) {
    const rows = [];
    for (const paragraph of text.split("\n")) {
      if (!paragraph) {
        rows.push("");
        continue;
      }
      const chars = Array.from(paragraph.replace(/^ {2}/, "　　"));
      while (chars.length) {
        let take = chars.splice(0, cols);
        while (chars.length && /[。，；：！？、）》」』】”’]/.test(chars[0])) take.push(chars.shift());
        rows.push(take.join(""));
      }
    }
    return rows;
  }
  function splitRows(type, s, g, measure) {
    const text = P.englishText(s.text, s.englishMode)
      .replace(/\r\n?/g, "\n")
      .replace(/\u00a0/g, " ");
    let rows = [];
    if (type === "hanzi")
      rows = Array.from(
        text.replace(/[^\u4e00-\u9fff\n]/g, "").replace(/\n+/g, (n) => " ".repeat(n.length - 1)),
      );
    else if (type === "cizu")
      rows = text
        .replace(/[^\u4e00-\u9fff\n]+/g, ",")
        .replace(/,*\n,*/g, "\n")
        .split(/[\n,]/);
    else if (type === "duanluo")
      rows =
        s.cellType === "hxg"
          ? breakText(text.replace(/^ {2}/gm, "　　"), g.width, measure, s.letterSpace)
          : chineseGridLines(text, g.cols);
    else if (type === "alphabet")
      rows = Array.from(text.replace(/[^\S\n]/g, "").replace(/\n+/g, (n) => " ".repeat(n.length - 1)));
    else if (type === "word")
      rows = text
        .replace(/[,，]/g, "\n")
        .split("\n")
        .map((x) => x.trim());
    else if (type === "paragraph") rows = englishLines(text, g.width, measure);
    else if (type === "number") rows = text.replace(/[^\d\n]/g, "").split("\n");
    else if (type === "pinyin")
      rows = text
        .toLowerCase()
        .replace(/[^a-züāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ\s]/g, " ")
        .split("\n")
        .map((x) => x.trim().replace(/[^\S\n]+/g, " "));
    else if (type === "bihua") rows = s.strokes.map((x) => ({ ...x }));
    else rows = Array.from(text).filter((c) => D.patternCodes.includes(c));
    if (s.blankCol && ["hanzi", "cizu", "number"].includes(type))
      rows = rows.map((r) => r + " ".repeat(r.length));
    if (s.blankRow) rows = rows.flatMap((r, i) => (i < rows.length - 1 ? [r, ""] : [r]));
    return rows;
  }
  function build(type, state, measure) {
    if (type === "paragraph" && ["trace", "answers"].includes(state.mathLayout))
      return MathV.build(state, WIDTH, HEIGHT);
    if (type === "hanzi" && state.batchNames?.length) {
      const sheets = state.batchNames.map((name) => {
        const s = { ...state, text: name, header: { ...state.header, name } };
        delete s.batchNames;
        return build(type, s, measure);
      });
      const pageMap = sheets.flatMap((sheet, index) =>
        Array.from({ length: sheet.pages }, (_, page) => ({ index, page })),
      );
      return {
        type,
        state: structuredClone(state),
        g: sheets[0].g,
        rows: sheets.flatMap((s) => s.rows),
        sheets,
        pageMap,
        pages: pageMap.length,
      };
    }
    const g = geometry(type, state);
    let rows;
    if (type === "paragraph" && ["to-en", "to-cn"].includes(state.englishMode)) {
      const blocks = P.englishPairs(state.text)
        .filter(Boolean)
        .map((pair, i) => {
          const text = P.englishText(pair.join("  /  "), state.englishMode).replace(
            /^1\./,
            String(i + 1) + ".",
          );
          const lines = englishLines(text, g.width, measure);
          return state.blankRow ? lines.flatMap((r) => [r, ""]) : lines;
        });
      rows = [];
      for (const block of blocks) {
        const left = g.rows - (rows.length % g.rows);
        if (left < block.length && left < g.rows) rows.push(...Array(left).fill(""));
        rows.push(...block);
      }
      if (state.fillPage && rows.length && rows.length % g.rows) {
        let i = 0;
        while (rows.length % g.rows) {
          const left = g.rows - (rows.length % g.rows),
            block = blocks[i++ % blocks.length];
          if (block.length > left) {
            rows.push(...Array(left).fill(""));
            break;
          }
          rows.push(...block);
        }
      }
    } else rows = splitRows(type, state, g, measure);
    if (state.fillPage && rows.length && !["to-en", "to-cn"].includes(state.englishMode)) {
      const original = rows.slice(),
        target = Math.ceil(rows.length / g.rows) * g.rows;
      while (rows.length < target) rows.push(structuredClone(original[rows.length % original.length]));
    }
    return {
      type,
      state: structuredClone(state),
      g,
      rows,
      pages: Math.max(1, Math.ceil(rows.length / g.rows)),
    };
  }
  function line(ctx, x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  function grid(ctx, x, y, w, h, kind, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.6;
    ctx.setLineDash([]);
    if (kind === "hxg" || kind === "dxg") {
      line(ctx, x, y + h, x + w, y + h);
      ctx.restore();
      return;
    }
    ctx.strokeRect(x, y, w, h);
    ctx.strokeStyle = color + "80";
    ctx.setLineDash([2, 2]);
    if (["tzg", "mzg", "htg", "hmg"].includes(kind)) {
      line(ctx, x, y + h / 2, x + w, y + h / 2);
      line(ctx, x + w / 2, y, x + w / 2, y + h);
    }
    if (["mzg", "hmg"].includes(kind)) {
      line(ctx, x, y, x + w, y + h);
      line(ctx, x + w, y, x, y + h);
    }
    if (kind === "jgg") {
      for (const n of [1, 2]) {
        line(ctx, x + (w * n) / 3, y, x + (w * n) / 3, y + h);
        line(ctx, x, y + (h * n) / 3, x + w, y + (h * n) / 3);
      }
    }
    if (["hgg", "htg", "hmg"].includes(kind)) {
      ctx.setLineDash([]);
      ctx.strokeRect(x + w / 4, y + h / 4, w / 2, h / 2);
    }
    if (kind === "sxg") {
      line(ctx, x, y + h / 3, x + w, y + h / 3);
      line(ctx, x, y + (h * 2) / 3, x + w, y + (h * 2) / 3);
    }
    if (kind === "lxg") line(ctx, x, y + h / 2, x + w, y + h / 2);
    if (kind === "num") {
      line(ctx, x, y + h / 2, x + w, y + h / 2);
    }
    ctx.restore();
  }
  function stroke(ctx, id, x, y, size, color, weight = 1) {
    const data = D.strokes.find((s) => s.id === id);
    if (!data) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size / 100, size / 100);
    ctx.strokeStyle = color;
    ctx.lineWidth = weight === 2 ? 6 : 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke(new Path2D(data.path));
    ctx.restore();
  }
  function pattern(ctx, code, x, y, size, color, bold = false) {
    ctx.save();
    ctx.translate(x + size * 0.1, y + size * 0.1);
    ctx.scale((size * 0.8) / 100, (size * 0.8) / 100);
    ctx.strokeStyle = color;
    ctx.lineWidth = bold ? 2.3 : 1.3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const p = (path) => ctx.stroke(new Path2D(path));
    const repeated = (vertical = false, diagonal = 0) => {
      for (let i = 8; i < 100; i += 14) {
        if (diagonal) line(ctx, diagonal > 0 ? 8 : 92, i, diagonal > 0 ? 92 : 8, Math.max(4, i - 22));
        else if (vertical) line(ctx, i, 5, i, 95);
        else line(ctx, 5, i, 95, i);
      }
    };
    if (code === "1") repeated();
    else if (code === "2") repeated(true);
    else if (code === "3" || code === "4") {
      ctx.save();
      if (code === "4") {
        ctx.rotate(Math.PI / 2);
        ctx.translate(0, -100);
      }
      p("M5 8 L95 8 L5 25 L95 25 L5 42 L95 42 L5 59 L95 59 L5 76 L95 76 L5 93 L95 93");
      ctx.restore();
    } else if (code === "5" || code === "6") {
      ctx.beginPath();
      for (let t = 0; t < Math.PI * 6; t += 0.06) {
        const r = 2 + t * 2.3,
          xx = 50 + Math.cos(t) * r * (code === "6" ? -1 : 1),
          yy = 50 + Math.sin(t) * r;
        t === 0 ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy);
      }
      ctx.stroke();
    } else if (code === "7") {
      repeated();
      repeated(true);
    } else if (code === "8") {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, 100, 100);
      ctx.clip();
      ctx.translate(50, 50);
      ctx.rotate(Math.PI / 4);
      ctx.translate(-50, -50);
      for (let i = -20; i < 130; i += 13) {
        line(ctx, i, -30, i, 130);
        line(ctx, -30, i, 130, i);
      }
      ctx.restore();
    } else if (code === "9" || code === "A") {
      for (let i = 10; i < 70; i += 16) {
        if (code === "9") p(`M${i} 90 L${i} ${i} L90 ${i}`);
        else p(`M10 ${i} L${100 - i} ${i} L${100 - i} 90`);
      }
    } else if (code === "B" || code === "C") {
      for (let i = 10; i < 95; i += 15) {
        if (code === "B") p(`M${i} 5 L${i} 42 M${i} 58 L${i} 95`);
        else p(`M5 ${i} L42 ${i} M58 ${i} L95 ${i}`);
      }
    } else if (code === "D" || code === "E") {
      ctx.save();
      if (code === "E") {
        ctx.translate(100, 0);
        ctx.scale(-1, 1);
      }
      p("M5 95 L5 5 L95 5 L95 95 L20 95 L20 20 L80 20 L80 80 L35 80 L35 35 L65 35 L65 65 L50 65 L50 50");
      ctx.restore();
    } else if (code === "F" || code === "G") {
      ctx.save();
      if (code === "G") {
        ctx.translate(100, 0);
        ctx.scale(-1, 1);
      }
      p(
        "M5 90 L5 70 L25 70 L25 50 L45 50 L45 30 L65 30 L65 10 L85 10 M20 95 L20 85 L40 85 L40 65 L60 65 L60 45 L80 45 L80 25 L95 25",
      );
      ctx.restore();
    } else if (code === "H" || code === "I") {
      for (let y = 15; y < 90; y += 22) {
        let path = `M5 ${y}`;
        for (let xx = 20; xx <= 95; xx += 15)
          path += ` L${xx} ${y + (((xx / 15) | 0) % 2 ? (code === "H" ? 14 : -10) : 0)}`;
        p(path);
      }
    } else if (code === "J" || code === "K") {
      ctx.save();
      if (code === "K") {
        ctx.rotate(Math.PI / 2);
        ctx.translate(0, -100);
      }
      for (let y = 15; y < 90; y += 25)
        p(`M5 ${y} Q15 ${y - 12} 25 ${y} T45 ${y} T65 ${y} T85 ${y} T105 ${y}`);
      ctx.restore();
    } else if (code === "L" || code === "M") repeated(false, code === "L" ? 1 : -1);
    else if (code === "N" || code === "O") {
      ctx.save();
      if (code === "O") {
        ctx.rotate(Math.PI / 2);
        ctx.translate(0, -100);
      }
      for (let y = 22; y < 95; y += 25)
        p(
          `M5 ${y} C5 ${y - 20} 30 ${y - 20} 30 ${y} C30 ${y + 16} 9 ${y + 16} 15 ${y} C20 ${y - 20} 55 ${y - 20} 55 ${y} C55 ${y + 16} 34 ${y + 16} 40 ${y} C45 ${y - 20} 80 ${y - 20} 80 ${y} C80 ${y + 16} 60 ${y + 16} 65 ${y} C70 ${y - 20} 95 ${y - 20} 95 ${y}`,
        );
      ctx.restore();
    } else if (code === "P" || code === "R") {
      for (let y = 15; y < 80; y += 20) {
        const d = code === "P" ? 15 : -15;
        p(`M5 ${y} Q27 ${y + d} 50 ${y} Q72 ${y + d} 95 ${y}`);
      }
    } else if (code === "Q") {
      for (let y = 10; y < 80; y += 30)
        for (let xx = 10; xx < 80; xx += 30)
          p(`M${xx} ${y} L${xx + 20} ${y} L${xx + 12} ${y + 20} L${xx - 8} ${y + 20} Z`);
    } else if (code === "S" || code === "T") {
      for (let xx of [10, 55])
        for (let yy of [10, 55]) {
          if (code === "T") ctx.strokeRect(xx, yy, 32, 32);
          else {
            ctx.beginPath();
            ctx.arc(xx + 16, yy + 16, 16, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
    } else if (code === "U") {
      let path = "";
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5,
          r = i % 2 ? 20 : 45;
        path += (i ? " L" : "M") + (50 + Math.cos(a) * r) + " " + (50 + Math.sin(a) * r);
      }
      p(path + " Z");
    } else if (code === "V") {
      for (let xx of [27, 72])
        p(`M${xx} 50 C${xx - 32} 20 ${xx + 32} 5 ${xx} 50 C${xx - 32} 95 ${xx + 32} 80 ${xx} 50`);
    } else if (code === "W") {
      p("M50 89 C12 66 0 43 14 22 C25 7 44 13 50 27 C56 13 75 7 86 22 C100 43 88 66 50 89 Z");
      p("M50 73 C25 55 19 40 27 29 C35 20 46 29 50 38 C54 29 65 20 73 29 C81 40 75 55 50 73 Z");
    }
    ctx.restore();
  }
  function fitFontSize(textWidth, base, maxWidth) {
    if (!textWidth || textWidth <= maxWidth) return base;
    return Math.max(base * 0.55, (base * maxWidth) / textWidth);
  }
  function drawText(ctx, text, x, y, maxWidth) {
    ctx.save();
    const width = ctx.measureText(text).width;
    if (width > maxWidth) {
      ctx.translate(x, y);
      ctx.scale(maxWidth / width, 1);
      ctx.fillText(text, 0, 0);
    } else ctx.fillText(text, x, y);
    ctx.restore();
  }
  function drawBishun(ctx, char, x, y, w, h, color, data) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.6;
    ctx.strokeRect(x, y, w, h);
    const paths = data?.[char]?.strokes;
    if (paths?.length) {
      const unit = h * 0.8,
        step = unit * 1.2;
      const scale = Math.min(1, w / (paths.length * step));
      for (let i = 0; i < paths.length; i++) {
        ctx.save();
        ctx.translate(x + unit * 0.2 + i * step * scale, y + h * 0.1 + unit * scale);
        ctx.scale((unit * scale) / 1024, (-unit * scale) / 1024);
        ctx.translate(0, -124);
        for (let j = 0; j <= i; j++) {
          ctx.fillStyle = j === i ? "#e14646" : "#222";
          ctx.fill(new Path2D(paths[j]));
        }
        ctx.restore();
      }
    } else if (char) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "10px Arial";
      ctx.textAlign = "left";
      ctx.fillText("笔顺数据未收录：" + char, x + 5, y + h / 2);
    }
    ctx.restore();
  }
  function readingsFor(row, s) {
    if (!row) return [];
    if (s.readings[row]) return s.readings[row].split(/\s+/);
    return root.pinyinPro ? root.pinyinPro.pinyin(row.trim(), { type: "array" }) : [];
  }
  function drawPage(canvas, model, pageIndex, scale = 2, strokeData = {}) {
    if (model.sheets) {
      const ref = model.pageMap[pageIndex];
      return drawPage(canvas, model.sheets[ref.index], ref.page, scale, strokeData);
    }
    const { type, state: s, g, rows, pages } = model;
    canvas.width = Math.round(WIDTH * scale);
    canvas.height = Math.round(HEIGHT * scale);
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.textBaseline = "middle";
    ctx.font = fontString(s);
    if (s.showHeader) {
      ctx.save();
      const h = s.header || {};
      ctx.fillStyle = "#263c32";
      ctx.font = '17px "LXGW WenKai", Arial';
      ctx.textAlign = "left";
      drawText(
        ctx,
        h.title || "书写练习",
        s.padding[3],
        s.padding[0] + 12,
        WIDTH - s.padding[1] - s.padding[3],
      );
      ctx.font = '12px "LXGW WenKai", Arial';
      drawText(
        ctx,
        "姓名：" +
          (h.name || "________") +
          "    班级：" +
          (h.className || "________") +
          "    日期：" +
          (h.date || "________"),
        s.padding[3],
        s.padding[0] + 38,
        WIDTH - s.padding[1] - s.padding[3],
      );
      ctx.restore();
    }
    if (model.mathPages) {
      MathV.draw(ctx, model, pageIndex, WIDTH, HEIGHT, D.fonts[s.font]?.family || D.fonts.wenkai.family);
      return canvas;
    }
    if (g.modeHeader) {
      ctx.save();
      ctx.fillStyle = "#222";
      ctx.font = "12px Arial";
      ctx.textAlign = "left";
      ctx.fillText(
        s.englishMode && s.englishMode !== "copy"
          ? P.englishModes.find((m) => m[0] === s.englishMode)?.[1]
          : { copy: "临写：看范字后独立书写", quiz: "看拼音写字：请独立书写", answer: "看拼音写字 · 答案版" }[
              s.practiceMode
            ],
        s.padding[3],
        s.padding[0] + (s.showHeader ? 56 : 0) + g.modeHeader / 2,
      );
      ctx.restore();
    }
    for (let r = 0; r < g.rows; r++) {
      const row = rows[pageIndex * g.rows + r],
        rowY = g.y + r * (g.rowHeight + g.gap),
        y = rowY + g.bishun + g.pinyin;
      if (g.bishun)
        drawBishun(
          ctx,
          typeof row === "string" ? row.trim() : "",
          g.x,
          rowY,
          g.width,
          g.bishun,
          s.lineColor,
          strokeData,
        );
      if (g.pinyin)
        for (let c = 0; c < g.cols; c++)
          grid(ctx, g.x + c * g.unit, rowY + g.bishun, g.unit, g.pinyin, "sxg", s.lineColor);
      if (
        ["word", "paragraph", "pinyin", "number"].includes(type) ||
        (type === "duanluo" && s.cellType === "hxg")
      )
        grid(ctx, g.x, y, g.width, g.size, s.cellType, s.lineColor);
      else
        for (let c = 0; c < g.cols; c++)
          grid(ctx, g.x + c * g.unit, y, g.unit, g.size, s.cellType, s.lineColor);
      if (!row) continue;
      ctx.font = fontString(s);
      ctx.fillStyle = s.traceColor;
      ctx.textAlign = "center";
      const baseY = y + g.size / 2 + (g.size * s.scale * s.offset) / 10000;
      if (type === "bihua") {
        if (!row.id) continue;
        const examples = Array.from(row.examples),
          n = Math.min(examples.length, g.cols);
        for (let c = 0; c < g.cols; c++) {
          if (c < s.traceNum && c < g.cols - n)
            stroke(
              ctx,
              row.id,
              g.x + c * g.unit + g.size * 0.1,
              y + g.size * 0.1,
              g.size * 0.8,
              s.leading && c === 0 ? "#000" : s.traceColor,
              s.fontWeight === "bold" ? 2 : 1,
            );
          else if (c >= g.cols - n) {
            ctx.fillStyle = s.traceColor;
            drawText(ctx, examples[c - g.cols + n], g.x + c * g.unit + g.unit / 2, baseY, g.unit * 0.95);
          }
        }
        continue;
      }
      if (type === "pen-control") {
        for (let c = 0; c < Math.min(s.fillPage ? g.cols : s.traceNum, g.cols); c++) {
          if (
            !s.controlGuides ||
            !Guides.control(ctx, row, g.x + c * g.unit, y, g.size, s.traceColor, s.fontWeight === "bold")
          )
            pattern(ctx, row, g.x + c * g.unit, y, g.size, s.traceColor, s.fontWeight === "bold");
        }
        continue;
      }
      if (type === "duanluo" || type === "paragraph") {
        ctx.fillStyle = s.traceColor;
        if (type === "duanluo" && s.cellType !== "hxg") {
          const chars = Array.from(row);
          for (let c = 0; c < chars.length; c++) {
            const col = Math.min(c, g.cols - 1);
            drawText(
              ctx,
              chars[c],
              g.x + col * g.unit + g.unit / 2 + (c >= g.cols ? g.unit * 0.3 : 0),
              baseY,
              g.unit * 0.9,
            );
          }
        } else {
          ctx.textAlign = "left";
          let xx = g.x;
          for (const char of Array.from(row)) {
            ctx.fillText(char, xx, baseY);
            xx += ctx.measureText(char).width + (type === "duanluo" ? s.letterSpace : 0);
          }
        }
        continue;
      }
      if (["hanzi", "cizu"].includes(type)) {
        const chars = Array.from(row),
          py = readingsFor(row, s);
        const mode = s.practiceMode || "trace",
          repeats = mode === "trace" ? (s.fillPage ? g.cols : s.traceNum) : 1;
        for (let c = 0; c < g.cols; c++) {
          const index = c % chars.length,
            repeat = Math.floor(c / chars.length),
            char = chars[index];
          if (repeat >= repeats || char === " ") continue;
          const ink = mode === "trace" ? P.traceInk(s, repeat, Math.floor(g.cols / chars.length)) : "#000";
          if (!ink) continue;
          ctx.fillStyle = ink;
          ctx.font = fontString(s);
          if (mode !== "quiz") drawText(ctx, char, g.x + c * g.unit + g.unit / 2, baseY, g.unit * 0.95);
          if (g.pinyin && py[index]) {
            // Shrink the whole syllable uniformly so long readings (e.g. chuáng) stay centred in their own cell.
            const base = g.pinyin * 0.6;
            ctx.font = `${base}px Arial`;
            const fitted = fitFontSize(ctx.measureText(py[index]).width, base, g.unit * 0.86);
            ctx.font = `${fitted}px Arial`;
            ctx.textAlign = "center";
            ctx.fillText(py[index], g.x + c * g.unit + g.unit / 2, rowY + g.bishun + g.pinyin * 0.44);
          }
        }
        continue;
      }
      if (type === "alphabet") {
        const content = s.pair && /^[a-z]$/i.test(row) ? row.toUpperCase() + row.toLowerCase() : row;
        for (let c = 0; c < Math.min(s.fillPage ? g.cols : s.traceNum, g.cols); c++) {
          const ink = P.traceInk(s, c, g.cols);
          if (!ink) continue;
          ctx.fillStyle = ink;
          if (s.alphabetGuides && /^[A-Za-z]+$/.test(content))
            Guides.alphabet(
              ctx,
              content,
              g.x + c * g.unit,
              y,
              g.unit,
              g.size,
              ink,
              s.guideStyle !== "solid" && c > 0,
              c === 0,
            );
          else drawText(ctx, content, g.x + c * g.unit + g.unit / 2, baseY, g.unit * 0.9);
        }
        continue;
      }
      // Words, numbers and pinyin repeat by measured width rather than a fixed character count.
      const content = row,
        spacing =
          type === "word"
            ? g.size * 0.5
            : Math.max(
                g.size * 0.33,
                g.size * 0.5 * (Array.from(content).length + 1) - ctx.measureText(content).width,
              ),
        width = ctx.measureText(content).width;
      ctx.textAlign = "left";
      let x = g.x;
      if (width > g.width && (s.fillPage || s.traceNum > 0)) {
        ctx.fillStyle = s.leading ? "#000" : s.traceColor;
        drawText(ctx, content, x, baseY, g.width);
        continue;
      }
      for (let n = 0; n < (s.fillPage ? 200 : s.traceNum) && x + width <= g.x + g.width + 0.1; n++) {
        const ink = P.traceInk(s, n, Math.max(1, Math.floor((g.width + spacing) / (width + spacing))));
        if (!ink) break;
        ctx.fillStyle = ink;
        ctx.fillText(content, x, baseY);
        x += width + spacing;
      }
    }
    if (pages > 1) {
      ctx.fillStyle = "#777";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.fillText(String(pageIndex + 1), WIDTH / 2, HEIGHT - 20);
    }
    return canvas;
  }
  const api = {
    MM,
    WIDTH,
    HEIGHT,
    fontString,
    geometry,
    splitRows,
    build,
    drawPage,
    pattern,
    stroke,
    englishLines,
    fitFontSize,
    grid,
  };
  root.WorkbookEngine = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
