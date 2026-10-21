$path = "pages\dashboard\settings-hub.jsx"
$c = Get-Content -LiteralPath $path -Raw -Encoding utf8

$old1 = "  const isOwner = user?.role === 'owner';"
$new1 = "  const isOwner = user?.role === 'owner';`n  const canSeeTeam = user?.role === 'owner' || user?.role === 'branch_manager';"

$old2 = "        {isOwner && ("
$new2 = "        {canSeeTeam && ("

if (-not $c.Contains($old1)) { Write-Host "NO MATCH (1)" }
elseif (-not $c.Contains($old2)) { Write-Host "NO MATCH (2)" }
else {
  $c = $c.Replace($old1, $new1).Replace($old2, $new2)
  Set-Content -LiteralPath $path -Value $c -Encoding utf8 -NoNewline
  Write-Host "Patched."
}

git --no-pager diff pages\dashboard\settings-hub.jsx
