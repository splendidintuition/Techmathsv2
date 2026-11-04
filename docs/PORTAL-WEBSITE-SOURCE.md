# Marketing website integration

Source reviewed: https://techmaths-dc.com/ (public site).

## Portal-side work completed

- Added a Services view with the nine published service lines and summaries.
- Added a Coverage view for the named hubs on the public site (Lisbon, Frankfurt, London, Amsterdam, Warsaw).
- Added the same nine service categories to the live ticket creation form.
- Added public-site links for service details, coverage information, and Request a Quote.
- Kept public quote enquiries distinct from authenticated client work requests: the public enquiry link goes to the existing website contact form; portal ticket creation requires an active invited account and a permitted organization/site.

The public site describes selected case studies as illustrative until client references are supplied; those have not been imported into operational data. Coverage/mobilisation figures are informational marketing content, not live availability or a ticket SLA.

## Remaining marketing-site handoff

Adding Client Login / Engineer Login buttons or changing the website Request a Quote form to link into the portal requires the marketing website source or its deployment workflow. The public site appears Netlify-hosted, but no Netlify connector or site repository is available in this workspace. Current portal work links outward to the site; it does not modify the public website or ingest its form submissions.

When the portal is deployed at `portal.techmaths-dc.com`, update Supabase Auth `site_url` and redirect allow-list to that production domain, then add explicit marketing-site links to the portal. Keep public lead enquiries in the contact form unless a reviewed spam-protected intake endpoint is implemented.
