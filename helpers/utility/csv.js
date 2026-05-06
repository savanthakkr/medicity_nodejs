'use strict';

function csvEscape(v) {
  if (v === null || v === undefined) return '';
  if (Array.isArray(v) || (typeof v === 'object' && v !== null)) v = JSON.stringify(v);

  let s = String(v);
  const mustQuote = /[",\n\r]/.test(s);
  s = s.replace(/"/g, '""');
  return mustQuote ? `"${s}"` : s;
}

function toCsv(rows = [], headers = []) {
  const head = headers.map(csvEscape).join(',');
  const lines = rows.map((r) => headers.map((h) => csvEscape(r[h])).join(','));
  return [head, ...lines].join('\n');
}

module.exports = { toCsv };
