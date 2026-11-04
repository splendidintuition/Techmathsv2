# Tech Maths website — simple owner guide

This guide is for the owner/editor. You do not need to code or use a terminal to request website changes.

## How to ask for a change

Send a message in plain language with:

1. **What to change** — for example, the phone number, a paragraph, a service description or a job advert.
2. **Where it appears** — if you know; otherwise say “wherever this appears on the website.”
3. **The exact new information or wording** — paste it so it can be copied accurately.
4. **Whether the change is temporary or permanent** — especially for vacancies, events or promotions.

Example:

> Please change the sales email everywhere on the website to sales@example.pt. Check the footer, Contact page and quote form, then send me the working website link.

The update workflow is: inspect the current site, make the change, run checks, rebuild/restart the preview if needed, and send a direct Chrome link with a brief plain-language summary. You should not need to edit code or use a localhost address.

## What `/admin` does today

The admin console is for viewing quote enquiries, changing lead status, exporting the lead list and checking basic traffic/content information. It is **not currently a text editor for public website pages**. Quote requests are saved in the admin lead queue; automatic email notifications have not been connected yet, so check `/admin` for new enquiries. For page wording, services, contact details, careers or images, tell the assistant what you want changed and it can update the site and verify the result.

## Current admin passcode

The preview passcode is `ADMIN`, as requested. It is easy to remember but **not safe for production**. Anyone who guesses it may enter `/admin` and see quote leads. Before real customer data or permanent launch, replace it with a unique, hard-to-guess passphrase and keep it private. Admin page: `/admin`.

## Company details on the site

- Brand: **Tech Maths**
- Legal entity: **Splendidintuition Lda**
- Address: **Rua Prof. Dom Henrique de Barros 28, Estadio 6, 2685-338 Prior Velho, Lisboa, Portugal**
- Phone / WhatsApp: **+351 928 262 816**
- General enquiries and career expressions of interest: **info@techmaths-dc.com**
- Sales and quote requests: **sales@techmaths-dc.com**
- Helpdesk: **helpdesk@techmaths-dc.com**
- The NIF/registration number was not supplied, so it is not shown.
- Public website domain: **techmaths-dc.com**. Canonical SEO URLs are set to `https://techmaths-dc.com`.

## Careers

The public Careers page is `/careers`, linked from the site navigation and footer. It invites expressions of interest at `info@techmaths-dc.com` and does not claim a vacancy is open. To add a real role, send the job title, location, work arrangement, responsibilities, required qualifications, salary range if publishable, closing date and application email.
