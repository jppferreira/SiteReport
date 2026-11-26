# Rollback instructions

Branch: `optimisation/app-size-reduction`

## Full branch rollback

```bash
git checkout main
git branch -D optimisation/app-size-reduction   # only if the branch is abandoned
```

If the branch was merged, revert the merge commit (do not force-push `main`).

## Category rollbacks (newest first)

| Commit (message) | Undo |
| --- | --- |
| `perf: compress illustrations…` | `git revert <sha>` — restores PNG/GIF assets and `assetBundlePatterns`; remove `expo-build-properties` if undesired |
| `fix: stop shipping GitHub PATs…` | **Do not reintroduce PATs into `extra`.** If mail-only contact is wrong, add a **server-side** issue proxy — never embed tokens |
| `feat: download Whisper model…` | `git revert <sha>` — restores EAS post-install bundling. Users who already downloaded the on-demand model keep their file; new installs get the bundled model again |
| `docs: add production app size baseline…` | Safe to leave or revert; docs only |

## Data safety

- Local SQLite, photos, subscriptions, and backups are untouched by these commits.
- On-demand Whisper stores files under app-private storage; uninstall clears them.
- Upgrading **to** this branch: one-time model download required even if an older binary had Whisper bundled.

## Production publish

Do **not** submit store builds from this branch until:

1. Physical iOS + Android regression (voice download, offline STT, splash, PDF, AR, IAP restore).
2. AAB/IPA size measured and compared to the baseline doc.
3. Any previously embedded GitHub PAT has been rotated (see `security-audit.md`).
