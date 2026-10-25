# Release process

This project creates releases from version tags. Pushing a tag that starts with
`v` runs the GitHub Actions release workflow. For example, `v1.2.0` creates a
release; a normal push to `main` does not deploy the application.

The deployed client embeds that tag in its environment status label. For a local
build that is not made from a release tag, the label falls back to the version
in `package.json`.

## One-time production setup

Complete these steps before the first production deployment:

1. Provision the Lightsail host and its supporting infrastructure as described
   in [`infra/README.md`](../infra/README.md).
2. In the GitHub repository, create an environment named `production`.
3. Add `LIGHTSAIL_HOST` as a repository or environment variable. Its value is
   the Lightsail public DNS name or static IP address.
4. Optionally add `LIGHTSAIL_USER`; it defaults to `ubuntu` when unset.
5. Add `LIGHTSAIL_SSH_PRIVATE_KEY` as an environment secret for `production`.
   Never commit this key or any production credentials to the repository.

If `LIGHTSAIL_HOST` is not configured, a release tag still produces a GitHub
Release and downloadable artifact, but the deployment job is skipped.

## Create a release

1. Start with a clean, up-to-date local `main` branch:

   ```sh
   git switch main
   git pull --ff-only origin main
   git status
   ```

   Continue only when `git status` reports no local changes.

2. Run the release checks locally:

   ```sh
   npm ci
   npm run lint
   npm test
   npm run build
   ```

3. Choose the next semantic version, such as `v1.2.0`. Confirm that no tag
   with that version already exists:

   ```sh
   git tag --list 'v*'
   ```

4. Create an annotated tag on the reviewed `main` commit and push it:

   ```sh
   git tag -a v1.2.0 -m "Release v1.2.0"
   git push origin v1.2.0
   ```

5. Open the **Actions** tab in GitHub and follow the **Release** workflow for
   the new tag. The build job installs dependencies, lints, tests, builds the
   client, packages the runtime files, and creates the GitHub Release.

6. If production deployment is configured, wait for **Deploy to Lightsail** to
   complete. It copies the release archive to the server, installs production
   dependencies, switches `/opt/api-contract-check/current` to the new
   versioned release, restarts the application service, reloads nginx, and
   checks the local HTTP endpoint.

7. Verify the public application manually after deployment. Check the GitHub
   Release page for its artifact and notes, then test the production URL and a
   representative API request without exposing real credentials.

## If a release fails

You can rerun failed jobs for the same tag when the failure is caused by a
transient GitHub Actions, artifact, or deployment problem. The workflow safely
replaces the uploaded artifact and refreshes that release's matching asset on a
rerun.

Do not move or recreate an existing tag. If fixing the failure requires a code
change, commit the fix, validate it, and publish the next unused version tag.
For a deployment failure, inspect the GitHub Actions logs and the Lightsail
service/nginx logs before deciding whether a rerun or new release is required.

## Roll back a Lightsail deployment

The deployment script keeps releases in
`/opt/api-contract-check/releases/<tag>` and points
`/opt/api-contract-check/current` at the active one. On the host, point that
symlink at a known-good release, then restart the service and reload nginx:

```sh
sudo ln -sfn /opt/api-contract-check/releases/vPREVIOUS /opt/api-contract-check/current
sudo systemctl restart api-contract-check
sudo systemctl reload nginx
```

Replace `vPREVIOUS` with the known-good tag and verify the application before
considering the rollback complete.
