# ATSPM Data Import to BigQuery (DatabaseInstaller)

## Purpose
This document describes the process for importing ATSPM event data to BigQuery using `DatabaseInstaller`.

It covers:
- Compressed Indiana events (`transfer-compressed-bq`)
- Raw (decompressed) Indiana events (`transfer-raw-bq`)
- Speed events (`transfer-speed-bq`)
- Event-log migration from SQL Server `ATSPM-EventLogs` to BigQuery (`copy-sql-bq`)

---

## Command Summary

| Command | Data Source | BigQuery Table | Notes |
|---|---|---|---|
| `transfer-compressed-bq` | SQL Server (`Controller_Event_Log` or `ControllerLogArchives`) | `ATSPM.IndianaEventLogs` | Supports `--storage-format`; supports `--credentials-file` |
| `transfer-raw-bq` | SQL Server (`ControllerLogArchives`) | `ATSPM.IndianaEventLogs` | Always decompresses archived payload |
| `transfer-speed-bq` | SQL Server (`MOE.dbo.Speed_Events`) | `ATSPM.SpeedEvents` | Requires `--source` |
| `copy-sql-bq` | SQL Server (`ATSPM-EventLogs`) | `ATSPM.IndianaEventLogs` | Follows `copy-sql` pattern, but writes to BigQuery |

---

## Data Structures: ATSPM Source -> BigQuery Target

## 1) Indiana events (`ATSPM.IndianaEventLogs`)

### BigQuery target schema
| Field | Type | Required |
|---|---|---|
| `LocationIdentifier` | `STRING` | Yes |
| `Timestamp` | `DATETIME` | Yes |
| `EventCode` | `INT64` | Yes |
| `EventParam` | `INT64` | Yes |

### A) `transfer-compressed-bq --storage-format transfer-events`
Source shape from SQL (`dbo.Controller_Event_Log`):

| Source column | Example | Target field |
|---|---|---|
| `SignalId` (from command location context) | `1001` | `LocationIdentifier` |
| `Timestamp` | `2026-03-01T08:15:12` | `Timestamp` |
| `EventCode` | `1` | `EventCode` |
| `EventParam` | `2` | `EventParam` |

### B) `transfer-compressed-bq --storage-format translate-events|uncompressed` and `transfer-raw-bq`
Source shape from SQL (`dbo.ControllerLogArchives.LogData`) is a JSON array of legacy `ControllerEventLog` items:

```json
[
  {
    "SignalIdentifier": "1001",
    "Timestamp": "2026-03-01T08:15:12",
    "EventCode": 1,
    "EventParam": 2
  }
]
```

Mapped in installer to `IndianaEventDto` before load:

```json
{
  "LocationIdentifier": "1001",
  "Timestamp": "2026-03-01T08:15:12",
  "EventCode": 1,
  "EventParam": 2
}
```

Notes:
- `LocationIdentifier` is sourced from the current location being processed.
- `translate-events` reads compressed payload from `ControllerLogArchives`.
- `uncompressed` reads uncompressed payload from `ControllerLogArchives`.

### C) `copy-sql-bq` (ATSPM-EventLogs -> BigQuery)
Source shape in `ATSPM-EventLogs` is a compressed event-log row (`CompressedEventLogs<IndianaEvent>`) with metadata + event list:

```json
{
  "LocationIdentifier": "1001",
  "ArchiveDate": "2026-03-01",
  "DeviceId": 123,
  "Data": [
    { "Timestamp": "2026-03-01T08:15:12", "EventCode": 1, "EventParam": 2 }
  ]
}
```

Resulting BigQuery row(s) are flattened from `Data` and inserted as:

```json
{
  "LocationIdentifier": "1001",
  "Timestamp": "2026-03-01T08:15:12",
  "EventCode": 1,
  "EventParam": 2
}
```

---

## 2) Speed events (`ATSPM.SpeedEvents`)

### BigQuery target schema
| Field | Type | Required |
|---|---|---|
| `LocationIdentifier` | `STRING` | Yes |
| `Timestamp` | `DATETIME` | Yes |
| `DetectorId` | `STRING` | Yes |
| `Mph` | `INT64` | Yes |
| `Kph` | `INT64` | Yes |

### `transfer-speed-bq` source shape
Source from SQL (`MOE.dbo.Speed_Events`):

| Source column | Example | Target field |
|---|---|---|
| location context (`--locations`) | `1001` | `LocationIdentifier` |
| `Timestamp` | `2026-03-01T08:15:12` | `Timestamp` |
| `DetectorID` | `1001-02` | `DetectorId` |
| `MPH` | `45` | `Mph` |
| `KPH` | `72` | `Kph` |

Resulting BigQuery row:

```json
{
  "LocationIdentifier": "1001",
  "Timestamp": "2026-03-01T08:15:12",
  "DetectorId": "1001-02",
  "Mph": 45,
  "Kph": 72
}
```

---

## High-Level Flow
For each day in the requested date range:
1. Resolve locations (explicit `--locations` or all configured locations).
2. Query events for each location.
3. Serialize rows to NDJSON and gzip to temp files.
4. Upload gzip files to GCS bucket `nw-utah-county-pel-event-uploads`.
5. Start a BigQuery load job from uploaded GCS files.
6. On successful load, delete uploaded GCS files.

Retry policy is built in for transient failures.

---

## Prerequisites
- Valid SQL Server source with event data.
- Active VPN access to the ATSPM network/database environment so SQL Server source database(s) are reachable.
- Google Cloud service account JSON with:
  - BigQuery load permissions
  - GCS object write/delete permissions for bucket `nw-utah-county-pel-event-uploads`
- BigQuery dataset `ATSPM` available in target project.
- A `DatabaseInstaller` debug/run output folder prepared and copied to the target machine.
- This implementation currently lives in **AvenueATSPM**, on the **Salt-Lake-Mobility** branch.
- This code cannot be easily transferred to the **TrafficPlanningAnalysis** project because it depends on ATSPM libraries/models/repositories.

---

## Configuration

## 1) BigQuery project/credentials
`Program.cs` resolves credentials and project id as follows:
- Credentials path:
  1. `TransferCommandConfiguration.CredentialsFile` (from `--credentials-file`, where supported)
  2. `BigQuery:CredentialsFile` in config
- Project id:
  1. `BigQuery:ProjectId`
  2. `project_id` from credentials JSON

### Recommended appsettings/user-secrets entries
```json
{
  "BigQuery": {
    "ProjectId": "your-gcp-project-id",
    "CredentialsFile": "C:\\secure\\gcp-service-account.json"
  },
  "TransferCommandConfiguration": {
    "Source": "Server=...;Database=...;User Id=...;Password=...;TrustServerCertificate=True;"
  }
}
```

## 2) SQL source connection
- `transfer-speed-bq` expects `--source` command option.
- `transfer-compressed-bq` and `transfer-raw-bq` do **not** expose `--source` option in command help, so source should be set via config (`TransferCommandConfiguration:Source`).

---

## Usage

## 0) Prepare and copy the run folder
On a build machine:
```powershell
dotnet build .\DatabaseInstaller\DatabaseInstaller.csproj -c Debug
```

Copy the run artifacts folder to the target machine (example path):
- `DatabaseInstaller\bin\Debug\net8.0\`

On the target machine:
1. Place the copied folder in a stable location (example: `C:\ATSPM\DatabaseInstaller\run`).
2. Ensure `appsettings.json` in that folder has the correct BigQuery and source DB settings.
3. Open PowerShell and run all commands **from that folder**.

```powershell
Set-Location C:\ATSPM\DatabaseInstaller\run
```

## A) Compressed Indiana events
```powershell
\.\DatabaseInstaller.exe transfer-compressed-bq `
  --start "2026-03-01" `
  --end "2026-03-07" `
  --locations "1001,1002" `
  --storage-format "translate-events" `
  --credentials-file "C:\secure\gcp-service-account.json"
```

### `--storage-format` values
- `transfer-events`: read from `dbo.Controller_Event_Log`
- `translate-events` (default): read compressed JSON from `dbo.ControllerLogArchives`
- `uncompressed`: read uncompressed payload from `dbo.ControllerLogArchives`

## B) Raw Indiana events
```powershell
\.\DatabaseInstaller.exe transfer-raw-bq `
  --start "2026-03-01" `
  --end "2026-03-07" `
  --locations "1001,1002"
```

## C) Speed events
```powershell
\.\DatabaseInstaller.exe transfer-speed-bq `
  --source "Server=sqlhost;Database=MOE;User Id=user;Password=pass;TrustServerCertificate=True;" `
  --start "2026-03-01" `
  --end "2026-03-07" `
  --locations "1001,1002"
```

## D) Move event logs from `ATSPM-EventLogs` to BigQuery (copy-sql-bq)
This command follows the same location/date/device filtering pattern as `copy-sql`, but stages NDJSON files in the GCS bucket and then runs BigQuery load jobs (instead of direct row inserts).

```powershell
.\DatabaseInstaller.exe copy-sql-bq `
  --source "Server=sqlhost;Database=ATSPM-EventLogs;User Id=user;Password=pass;TrustServerCertificate=True;" `
  --start "2026-03-01" `
  --end "2026-03-07" `
  --locations "1001,1002"
```

---

## Operational Notes
- All BigQuery commands in this process stage files in GCS bucket `nw-utah-county-pel-event-uploads` and then load to BigQuery, so they avoid direct streaming-insert cost patterns.
- BigQuery destination dataset is currently hard-coded as `ATSPM`.
- Table names are:
  - `IndianaEventLogs`
  - `SpeedEvents`
- Writes append (`WriteAppend`) to existing table data.
- `--threads` exists in command options, but current BigQuery transfer implementation processes tasks via `Task.WhenAll` across locations.

---

## Validation Checklist
After running:
1. Confirm logs show `Created BigQuery load job` and `succeeded`.
2. Confirm expected row increase in:
   - `ATSPM.IndianaEventLogs` or
   - `ATSPM.SpeedEvents`
3. Confirm uploaded GCS objects were deleted after successful load.

---

## Troubleshooting
- **Missing credentials error**: set `--credentials-file` (compressed command) or `BigQuery:CredentialsFile` config.
- **Missing project id error**: set `BigQuery:ProjectId` or ensure `project_id` exists in the service-account JSON.
- **No records loaded**: verify date window, location identifiers, and SQL source data.
- **Load job fails**: inspect logged BigQuery `Reason` and `Message` details in command output.

---

## Quick Help
```powershell
.\DatabaseInstaller.exe transfer-compressed-bq --help
.\DatabaseInstaller.exe transfer-raw-bq --help
.\DatabaseInstaller.exe transfer-speed-bq --help
.\DatabaseInstaller.exe copy-sql-bq --help
```