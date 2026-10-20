# Download curated SFX from Sound Effect Lab (soundeffect-lab.info)
# Run this script manually to respect robots.txt.
# Usage: .\scripts\download-sfx.ps1
# Output: src/assets/sfx/*.mp3
#
# Requires: curl (Git for Windows) or any HTTP client that can set Referer.

$curl = "C:\Program Files\Git\mingw64\bin\curl.exe"
if (-not (Test-Path $curl)) {
    # Try to find curl in PATH
    $cmd = Get-Command curl.exe -ErrorAction SilentlyContinue
    if ($cmd) { $curl = $cmd.Source } else { Write-Host "curl.exe not found. Install Git for Windows." -ForegroundColor Red; exit 1 }
}

# Resolve the output folder from the repo root, not the caller's directory.
$outDir = Join-Path (Split-Path -Parent $PSScriptRoot) "src/assets/sfx"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$sounds = @(
    @{ key="ui_click";       cat="button";     file="decision1.mp3" },
    @{ key="ui_cancel";      cat="button";     file="cancel1.mp3" },
    @{ key="ui_success";     cat="button";     file="success1.mp3" },
    @{ key="ui_levelup";     cat="anime";      file="levelup1.mp3" },
    @{ key="ui_item_get";    cat="anime";      file="item-get1.mp3" },
    @{ key="ui_item_get2";   cat="anime";      file="item-get2.mp3" },
    @{ key="lantern_on";     cat="various";    file="lighting-on1.mp3" },
    @{ key="lantern_off";    cat="various";    file="lighting-off1.mp3" },
    @{ key="light_pulse";    cat="anime";      file="spotlight1.mp3" },
    @{ key="rune_activate";  cat="anime";      file="bell1.mp3" },
    @{ key="puzzle_solved";  cat="anime";      file="church-bell1.mp3" },
    @{ key="puzzle_error";   cat="button";     file="cancel9.mp3" },
    @{ key="mirror_rotate";  cat="various";    file="doorknob1.mp3" },
    @{ key="door_open";      cat="various";    file="door-open1.mp3" },
    @{ key="door_close";     cat="various";    file="door-close1.mp3" },
    @{ key="gate_open";      cat="various";    file="gate-open1.mp3" },
    @{ key="footstep_grass"; cat="various";    file="walk-lawn1.mp3" },
    @{ key="footstep_soil";  cat="various";    file="walk-soil1.mp3" },
    @{ key="ambient_creek";  cat="environment"; file="creek1.mp3" },
    @{ key="crystal_pickup"; cat="anime";      file="item-get2.mp3" }
)

$ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

foreach ($s in $sounds) {
    $out = Join-Path $outDir "$($s.key).mp3"
    if (Test-Path $out) {
        Write-Host "SKIP (exists): $($s.key)"
        continue
    }
    $url = "https://soundeffect-lab.info/sound/$($s.cat)/mp3/$($s.file)"
    $referer = "https://soundeffect-lab.info/sound/$($s.cat)/"
    Write-Host "Downloading $($s.key) ... $url"
    & $curl -s -o $out -H "User-Agent: $ua" -H "Referer: $referer" $url
    if (Test-Path $out) {
        $size = (Get-Item $out).Length
        $magic = [System.IO.File]::ReadAllBytes($out)[0..2]
        # An error page is bigger than 1 KB, so validate the container, not just the size.
        $isMp3 = ($magic[0] -eq 0x49 -and $magic[1] -eq 0x44 -and $magic[2] -eq 0x33) -or
                 ($magic[0] -eq 0xFF -and ($magic[1] -band 0xE0) -eq 0xE0)
        if ($size -lt 1000) {
            Write-Host "  FAILED (too small: $size bytes)" -ForegroundColor Red
            Remove-Item $out
        } elseif (-not $isMp3) {
            Write-Host "  FAILED (not an MP3 payload: $size bytes)" -ForegroundColor Red
            Remove-Item $out
        } else {
            Write-Host "  OK ($size bytes)"
        }
    } else {
        Write-Host "  FAILED: file not created" -ForegroundColor Red
    }
    Start-Sleep -Milliseconds 500
}
Write-Host "Done. Files in $outDir"
