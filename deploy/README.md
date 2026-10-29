# GCP personal deployment

This app runs on Cloud Run in `asia-southeast1` (Singapore), project
`project-422405a7-b76c-49df-b1c`. It uses request-based billing, 1 vCPU,
512 MiB RAM, concurrency 40, minimum 0 instances, and service maximum 1 instance.
It sleeps when unused, so the first page load after idle can take a few seconds.
The limit controls normal capacity; it is not a hard billing cap, and GCP can
temporarily exceed it during maintenance or revision transitions.

The browser sends video straight to Decart over WebRTC. There is no GPU,
database, VM, load balancer, or paid reserved public IP for this app.

## Resources

- Service: `livetryon`
- Artifact Registry repository: `livetryon` in `asia-southeast1`
- Runtime service account: `livetryon-run@project-422405a7-b76c-49df-b1c.iam.gserviceaccount.com`
- Secret: `livetryon-decart-keys`, injected as `DECART_API_KEYS`
- Custom domain: `livetryon.fabricvton.com`
- Live fallback URL: https://livetryon-536440059442.asia-southeast1.run.app

The mapping has issued this exact GoDaddy DNS record:

| Type | Name | Value | TTL |
| --- | --- | --- | --- |
| CNAME | livetryon | ghs.googlehosted.com | 600 seconds or lowest available |

At deployment handoff, the custom domain certificate is pending DNS setup.
The fallback URL already has working HTTPS.

`.gcloudignore` and `.dockerignore` allow only app source, assets, manifests,
and build configuration. Local keys, environment files, Git history, and
`node_modules` are not uploaded. Next.js file tracing also excludes local secrets.
The final container runs as the unprivileged `node` user.

## Deploy an update (PowerShell, from the repository root)

```powershell
$tryonProject = 'project-422405a7-b76c-49df-b1c'
$tryonRegion = 'asia-southeast1'
$tryonTag = Get-Date -Format 'yyyyMMdd-HHmmss'
$tryonImage = "$tryonRegion-docker.pkg.dev/$tryonProject/livetryon/app:$tryonTag"

gcloud builds submit . --project=$tryonProject --region=$tryonRegion --tag=$tryonImage --timeout=1200
if ($LASTEXITCODE -ne 0) { throw 'Build failed; deployment stopped.' }

gcloud run deploy livetryon --project=$tryonProject --region=$tryonRegion `
  --image=$tryonImage --service-account="livetryon-run@$tryonProject.iam.gserviceaccount.com" `
  --allow-unauthenticated --ingress=all --port=8080 --cpu=1 --memory=512Mi `
  --concurrency=40 --timeout=60 --min=0 --max=1 --cpu-throttling `
  --set-env-vars 'NODE_ENV=production,NEXT_TELEMETRY_DISABLED=1,CREDITS_PER_KEY=1000,KEYS_SECRET=livetryon-decart-keys' `
  --set-secrets=DECART_API_KEYS=livetryon-decart-keys:latest
if ($LASTEXITCODE -ne 0) { throw 'Deployment failed.' }
```

This deploys the current working files, including uncommitted UI changes.
Cloud Build builds on Linux, so a running local Docker daemon is unnecessary.
The Docker build includes the production Next.js build and TypeScript checks.

## Domain and GoDaddy DNS

The base domain `fabricvton.com` is already verified for the deploying account.
Cloud Run's native domain mapping provides a Google-managed HTTPS certificate.
It is a Preview feature with documented latency limitations, used here to avoid
the fixed cost of a load balancer for personal use.

Display the actual DNS records issued for this service:

```powershell
gcloud beta run domain-mappings describe --domain=livetryon.fabricvton.com `
  --project=project-422405a7-b76c-49df-b1c --region=asia-southeast1 `
  --format='yaml(status.resourceRecords,status.conditions)'
```

In GoDaddy, open **fabricvton.com > DNS > Add New Record**. For a subdomain
mapping, use CNAME with name `livetryon` and the exact target in
`status.resourceRecords` (normally `ghs.googlehosted.com`). Use TTL 600 seconds
or the lowest offered. Replace any conflicting record for `livetryon` only;
leave other subdomains and the root domain alone. No A record is needed.
After DNS resolves, Google provisions HTTPS automatically, usually in about
15 minutes but sometimes up to 24 hours. Camera access requires working HTTPS.

## Rotate keys

Update the local gitignored `keys.csv`, then upload it directly without
printing its contents:

```powershell
gcloud secrets versions add livetryon-decart-keys `
  --project=project-422405a7-b76c-49df-b1c --data-file=keys.csv
```

The app reads the newest version of this secret at runtime (`KEYS_SECRET`), so
new keys apply within about 30 seconds and no redeploy is needed. The
`DECART_API_KEYS` variable is only a fallback if Secret Manager can't be read.
Include all desired keys in the CSV; local `.env.local` is not uploaded. Disable
unused old secret versions after confirming the update.

## Billing page and removing empty keys

`/billing` asks Decart for the credits on every key and shows the total credits
and time left. When a key is at zero it is removed by saving a new secret version
without it (the old version stays, so a removal can be undone by re-enabling it
or adding the old text back). For that, the runtime service account needs
permission to add versions, in addition to the read access it already has:

```powershell
gcloud secrets add-iam-policy-binding livetryon-decart-keys `
  --project=project-422405a7-b76c-49df-b1c `
  --member="serviceAccount:livetryon-run@project-422405a7-b76c-49df-b1c.iam.gserviceaccount.com" `
  --role="roles/secretmanager.secretVersionAdder"
```

Without that role the page still works, shows the balances, and reports that it
could not update the key list. `/billing` and `/api/billing` are public like the
rest of the app, so anyone with the URL can see the balances and trigger removal
of keys that are already empty.

## Cost and storage

For light personal use, request-based Cloud Run compute should fit its shared
free allowance. This is an estimate, not a billing guarantee: free allowances
are shared across the billing account, which already has other applications.
Registry storage, one active secret version, traffic, builds, and taxes can add
small charges. Decart credits are billed separately and continue during a live
session, even while Cloud Run is idle.

The dedicated image repository deletes images older than seven days while
keeping the latest two versions. GCP applies cleanup asynchronously. Reapply:

```powershell
gcloud artifacts repositories set-cleanup-policies livetryon `
  --project=project-422405a7-b76c-49df-b1c --location=asia-southeast1 `
  --policy=deploy/artifact-cleanup.json --no-dry-run
```

The app retains its existing public access model. Anyone with the URL can
start a session and consume Decart credits; same-origin checks are not a login.

## Verification on 2026-10-23

- Cloud Build `183260b4-19e7-40e0-8795-57d3016a8c36`: succeeded, including
  production compilation, TypeScript, and checks excluding local secret files.
- Cloud Run revision `livetryon-00003-887`: ready, receiving 100% of traffic.
- Public page, static assets, and optimized images served successfully over HTTPS.
- All nine key IDs loaded; token minting succeeded without exposing permanent keys.
- Cross-origin token request returned 403; `/keys.csv` and `/.env.local` returned 404.
- Browser filter interaction worked and visible garment images loaded. The page
  reported a secure context and camera API availability.
- Concurrency was raised from 8 to 40 after the initial browser asset burst hit
  the one-instance request limit. Subsequent page and image checks succeeded.
- A real camera/WebRTC generation session was not run.
- GoDaddy DNS and custom-domain HTTPS remain pending the CNAME above.

Pricing references checked on 2026-10-23:

- https://cloud.google.com/run/pricing
- https://cloud.google.com/artifact-registry/pricing
- https://cloud.google.com/secret-manager/pricing
- https://cloud.google.com/build/pricing
- https://docs.cloud.google.com/run/docs/mapping-custom-domains
