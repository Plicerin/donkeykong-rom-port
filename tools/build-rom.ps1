# Rebuilds the Donkey Kong cartridge from donkey_kong_2600.asm with DASM and
# checks it against the cartridge's MD5. Output: tools/build/donkey_kong.bin
# (git-ignored). Needs DASM v2.20.17 in tools/dasm (dasm.exe + vcs.h).
#
# Two adjustments for current DASM; neither changes a byte of the result:
# - the two "ldy #<A-B+C" lines evaluate negative, which DASM now rejects, so
#   the low byte is taken explicitly with "& $FF"
# - the disassembly used an older vcs.h with the TIA read registers at $30
#   (INPT4 = $3C etc.), so TIA_BASE_READ_ADDRESS is set to $30

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $PSScriptRoot 'build'
New-Item -ItemType Directory -Force $out | Out-Null

$src = Get-Content (Join-Path $root 'donkey_kong_2600.asm') -Raw
foreach ($table in 'FirefoxDownLadderTable-DownLadderTable', 'FirefoxUpLadderTable-UpLadderTable') {
  $src = $src.Replace("ldy #<$table+MAX_FIREFOX_LADDERS", "ldy #[$table+MAX_FIREFOX_LADDERS] & `$FF")
}
# DASM runs in a temp folder because Windows' Controlled Folder Access stops
# it writing under Documents; the results are copied back afterwards
$tmp = Join-Path ([IO.Path]::GetTempPath()) 'dk-rom-build'
New-Item -ItemType Directory -Force $tmp | Out-Null
Set-Content -Path (Join-Path $tmp 'dk_build.asm') -Value $src -NoNewline -Encoding ascii
Copy-Item (Join-Path $PSScriptRoot 'dasm\vcs.h') $tmp -Force

Push-Location $tmp
try {
  # passed as an array: PowerShell mangles "-DNAME=value" written inline
  $dasmArgs = @('dk_build.asm', '-f3', '-DTIA_BASE_READ_ADDRESS=48', '-odonkey_kong.bin', '-ldonkey_kong.lst', '-sdonkey_kong.sym')
  & (Join-Path $PSScriptRoot 'dasm\dasm.exe') @dasmArgs
  if ($LASTEXITCODE -ne 0) { throw "DASM failed ($LASTEXITCODE)" }
} finally { Pop-Location }
Copy-Item (Join-Path $tmp 'donkey_kong.*') $out -Force

$md5 = (Get-FileHash (Join-Path $out 'donkey_kong.bin') -Algorithm MD5).Hash.ToLower()
if ($md5 -ne '36b20c427975760cb9cf4a47e41369e4') { throw "assembled ROM MD5 $md5 does not match the cartridge" }
"OK: tools/build/donkey_kong.bin matches the cartridge ($md5)"
