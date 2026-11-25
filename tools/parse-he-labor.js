#!/usr/bin/env node
/* Read one morning Hotel Effectiveness folder and print the ingest payload.
   Does not store employee codes or PINs. The token is an environment variable,
   never a command argument.

   Print only:
     node tools/parse-he-labor.js --dir /workspace/cleans-1130 --hotel MSPWE --date 2026-11-29

   Post to HotelHQ (service token; the function uses the service role inside Supabase):
     HOTELHQ_LABOR_INGEST_TOKEN='(set in the shell, do not commit)' \
       node tools/parse-he-labor.js --dir /workspace/cleans-1130 --hotel MSPWE --date 2026-11-29 --post

   Optional URL override:
     HOTELHQ_LABOR_INGEST_URL=https://clxvmtbmveusrbxacnxe.supabase.co/functions/v1/ingest-daily-labor

   Expected files in the folder (CSV or TSV, header row):
     Hskp Details Daily (Group)     name, position, hours, cleans, mpr
     Missing Punches                name, position, missing in/out
     Position Win/Loss              position, actual, plan, scheduled
     Associate hours (optional)     name, position, actual, plan, scheduled, plan level

   The posted JSON is the payload documented at the top of tools/he-labor.js.
   The database builds numbered action items. A second post for the same hotel
   and date does not change the first snapshot.
*/
"use strict";

var fs = require("fs");
var path = require("path");
var he = require("./he-labor.js");

var DEFAULT_URL = "https://clxvmtbmveusrbxacnxe.supabase.co/functions/v1/ingest-daily-labor";

function arg(name) {
  var i = process.argv.indexOf(name);
  if (i < 0 || !process.argv[i + 1] || process.argv[i + 1].indexOf("--") === 0) return "";
  return process.argv[i + 1];
}
function fail(message) {
  console.error(message);
  process.exit(1);
}

async function main() {
  if (process.argv.indexOf("--help") >= 0 || process.argv.indexOf("-h") >= 0) {
    console.log(fs.readFileSync(__filename, "utf8").split("*/")[0].replace(/^\/\*\n?/, "").replace(/\n \*/g, "\n"));
    return;
  }
  var dir = arg("--dir");
  var hotel = arg("--hotel").toUpperCase();
  var workDate = arg("--date");
  var post = process.argv.indexOf("--post") >= 0;
  if (!dir || !hotel || !workDate) fail("Need --dir, --hotel, and --date. See --help.");
  if (!he.HOTELS[hotel]) fail("unknown hotel");
  if (!he.HOTELS[hotel].enabled) fail(hotel + " is not on daily labor yet. Golden Valley (MSPWE) is the launch hotel.");
  var names = fs.readdirSync(dir).filter(function (name) {
    return /\.(csv|tsv|txt|tab)$/i.test(name);
  });
  if (!names.length) fail("No CSV or TSV exports in " + dir);
  var files = names.map(function (name) {
    return { name: name, text: fs.readFileSync(path.join(dir, name), "utf8") };
  });
  var parsed = he.readFiles(files, { hotel: hotel, workDate: workDate });
  if (!parsed.ok) fail(parsed.errors.join("\n"));
  var payload = parsed.payload;
  if (!payload.positions_loaded && !payload.housekeeping_loaded && !payload.punches_loaded) {
    fail("None of the files matched housekeeping, missing punches, or position win/loss.");
  }
  process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
  if (!post) return;
  var token = process.env.HOTELHQ_LABOR_INGEST_TOKEN || "";
  if (!token) fail("Set HOTELHQ_LABOR_INGEST_TOKEN in the environment. Do not pass the token as an argument.");
  var url = process.env.HOTELHQ_LABOR_INGEST_URL || DEFAULT_URL;
  var res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "authorization": "Bearer " + token },
    body: JSON.stringify(payload)
  });
  var body = await res.text();
  if (!res.ok) fail("Ingest failed (" + res.status + "): " + body.slice(0, 400));
  console.error(body);
}

main().catch(function (err) { fail(err && err.message ? err.message : String(err)); });
