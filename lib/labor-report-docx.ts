import "server-only";

export type DocxReportSlot = { timeIn: string; timeOut: string; hours: string; accomplishments: string; remarks: string; signature: string };
export type DocxReportDay = { date: string; am: DocxReportSlot; pm: DocxReportSlot };
export type DocxLaborReport = {
  name: string; workAssignment: string; department: string; periodFrom: string; periodTo: string;
  scholarSignature: string; supervisorSignature: string; days: DocxReportDay[];
};

function esc(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

function formatDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric" }).format(new Date(Date.UTC(year, month - 1, day, 4)));
}

function formatTime(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return value;
  const hour = Number(match[1]);
  return `${hour % 12 || 12}:${match[2]} ${hour < 12 ? "AM" : "PM"}`;
}

function textXml(value: string) {
  return value.split("\n").map((line, i) => `${i ? "<w:br/>" : ""}<w:t xml:space="preserve">${esc(line)}</w:t>`).join("");
}

/** Replace the paragraph's text while retaining its template paragraph and run formatting. */
function setCellText(cellXml: string, value: string, align?: "left" | "center") {
  const tcPrEnd = cellXml.indexOf("</w:tcPr>");
  if (tcPrEnd < 0) return cellXml;
  const prefix = cellXml.slice(0, tcPrEnd + 9);
  const content = cellXml.slice(tcPrEnd + 9, cellXml.lastIndexOf("</w:tc>"));
  const firstP = /<w:p\b[^>]*>[\s\S]*?<\/w:p>/.exec(content)?.[0];
  const pPr = firstP?.match(/<w:pPr\b[^>]*>[\s\S]*?<\/w:pPr>/)?.[0] ?? "";
  const rPr = firstP?.match(/<w:rPr\b[^>]*>[\s\S]*?<\/w:rPr>/)?.[0] ?? '<w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr>';
  let adjustedPPr = pPr;
  if (align && pPr) {
    adjustedPPr = /<w:jc\b[^>]*\/>/.test(pPr)
      ? pPr.replace(/<w:jc\b[^>]*\/>/, `<w:jc w:val="${align}"/>`)
      : pPr.replace("</w:pPr>", `<w:jc w:val="${align}"/></w:pPr>`);
  }
  const paragraph = `<w:p>${adjustedPPr}<w:r>${rPr}${textXml(value)}</w:r></w:p>`;
  return `${prefix}${paragraph}</w:tc>`;
}

function replaceParagraph(body: string, matcher: (text: string) => boolean, create: (pPr: string) => string) {
  const paragraphs = [...body.matchAll(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g)];
  for (const match of paragraphs) {
    const xml = match[0];
    const text = [...xml.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g)].map((part) => part[1]).join("");
    if (!matcher(text)) continue;
    const pPr = xml.match(/<w:pPr\b[^>]*>[\s\S]*?<\/w:pPr>/)?.[0] ?? "";
    return body.slice(0, match.index) + create(pPr) + body.slice(match.index! + xml.length);
  }
  return body;
}

function replaceTableRows(table: string, rows: string[]) {
  const matches = [...table.matchAll(/<w:tr\b[\s\S]*?<\/w:tr>/g)];
  if (matches.length < 15) throw new Error("The labor report template table has an unexpected layout.");
  const start = matches[0].index!;
  const last = matches[matches.length - 1];
  return table.slice(0, start) + rows.join("") + table.slice(last.index! + last[0].length);
}

function updateRow(templateRow: string, values: string[], date?: string) {
  let index = 0;
  return templateRow.replace(/<w:tc\b[\s\S]*?<\/w:tc>/g, (cell) => {
    const cellIndex = index++;
    if (cellIndex === 0 && date === undefined) return cell;
    if (cellIndex >= values.length) return cell;
    // The AM/PM column in the source template is split over two lines and already styled.
    if (cellIndex === 1) {
      let textIndex = 0;
      return cell.replace(/<w:t\b([^>]*)>[\s\S]*?<\/w:t>/g, (_whole, attrs: string) => {
        const part = values[cellIndex].replace(/\s/g, "")[textIndex++] ?? "";
        return `<w:t${attrs}>${esc(part)}</w:t>`;
      });
    }
    return setCellText(cell, values[cellIndex], cellIndex === 0 || cellIndex === 2 || cellIndex === 3 || cellIndex === 4 ? "center" : undefined);
  });
}

function metadataParagraph(pPr: string, firstLabel: string, firstValue: string, secondLabel: string, secondValue: string) {
  const label = (value: string) => `<w:r><w:rPr><w:b/><w:bCs/><w:sz w:val="19"/><w:szCs w:val="19"/></w:rPr><w:t xml:space="preserve">${esc(value)} </w:t></w:r>`;
  const value = (text: string) => `<w:r><w:rPr><w:sz w:val="19"/><w:szCs w:val="19"/><w:u w:val="single"/></w:rPr><w:t xml:space="preserve">${textXml(text)}</w:t></w:r>`;
  return `<w:p>${pPr}${label(firstLabel)}${value(firstValue)}<w:r><w:tab/></w:r>${label(secondLabel)}${value(secondValue)}</w:p>`;
}

export function buildLaborReportDocumentXml(templateXml: string, report: DocxLaborReport) {
  const root = /<w:document\b[^>]*>/.exec(templateXml)?.[0];
  const bodyMatch = /<w:body\b[^>]*>([\s\S]*?)<\/w:body>/.exec(templateXml);
  if (!root || !bodyMatch) throw new Error("Could not read the labor report template.");
  let body = bodyMatch[1];

  body = replaceParagraph(body, (text) => text.includes("Name of Work Scholar:") && text.includes("Work Assignment:"), (pPr) => metadataParagraph(pPr, "Name of Work Scholar:", report.name, "Work Assignment:", report.workAssignment));
  body = replaceParagraph(body, (text) => text.includes("Period Covered:") && text.includes("Department:"), (pPr) => metadataParagraph(pPr, "Period Covered:", `From ${formatDate(report.periodFrom)} to ${formatDate(report.periodTo)}`, "Department:", report.department));

  const tables = [...body.matchAll(/<w:tbl\b[\s\S]*?<\/w:tbl>/g)];
  if (tables.length < 3) throw new Error("The labor report template is missing its report or signature table.");
  const reportTable = tables[1][0];
  const tableRows = [...reportTable.matchAll(/<w:tr\b[\s\S]*?<\/w:tr>/g)];
  const outputRows = [tableRows[0][0], tableRows[1][0]];
  for (const day of report.days) {
    const weekday = new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", weekday: "long" }).format(new Date(`${day.date}T04:00:00Z`));
    const date = `${formatDate(day.date)}\n${weekday}`;
    for (const [period, slot, sourceIndex] of [["AM", day.am, 2], ["PM", day.pm, 3]] as const) {
      const values = [date, period, formatTime(slot.timeIn), formatTime(slot.timeOut), slot.hours, slot.accomplishments, slot.remarks, slot.signature];
      outputRows.push(updateRow(tableRows[sourceIndex][0], values, sourceIndex === 2 ? date : undefined));
    }
  }
  const totalHours = report.days.reduce((sum, day) => sum + (Number(day.am.hours) || 0) + (Number(day.pm.hours) || 0), 0);
  const totalRow = tableRows[tableRows.length - 1][0];
  const totalCells = [...totalRow.matchAll(/<w:tc\b[\s\S]*?<\/w:tc>/g)];
  let cellIndex = 0;
  const updatedTotal = totalRow.replace(/<w:tc\b[\s\S]*?<\/w:tc>/g, (cell) => {
    const current = cellIndex++;
    return current === 1 ? setCellText(cell, totalHours.toFixed(2), "center") : cell;
  });
  outputRows.push(updatedTotal);
  void totalCells;
  const rewrittenReportTable = replaceTableRows(reportTable, outputRows);
  body = body.replace(reportTable, rewrittenReportTable);

  const signatureTable = [...body.matchAll(/<w:tbl\b[\s\S]*?<\/w:tbl>/g)][2][0];
  const signatureRows = [...signatureTable.matchAll(/<w:tr\b[\s\S]*?<\/w:tr>/g)];
  const signerRow = signatureRows[0][0];
  let signerCellIndex = 0;
  const updatedSignerRow = signerRow.replace(/<w:tc\b[\s\S]*?<\/w:tc>/g, (cell) => {
    const current = signerCellIndex++;
    return current === 1 ? setCellText(cell, report.scholarSignature, "center") : current === 3 ? setCellText(cell, report.supervisorSignature, "center") : cell;
  });
  body = body.replace(signatureTable, replaceTableRows(signatureTable, [updatedSignerRow, signatureRows[1][0]]));

  const section = /<w:sectPr\b[\s\S]*?<\/w:sectPr>/.exec(templateXml)?.[0];
  if (!section) throw new Error("The labor report template page setup is missing.");
  return `${root}<w:body>${body}</w:body></w:document>`;
}
