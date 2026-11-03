import type { Insight } from "../types";

/** Insights: articles, checklists and downloadable guides. */
export const INSIGHTS: Insight[] = [
  {
    slug: "the-rack-elevation-is-the-contract",
    position: 1,
    title: "The rack elevation is the contract",
    excerpt:
      "Most data center build disputes come down to one document nobody took seriously. Treating the elevation as a signed deliverable removes most of them.",
    kind: "guide",
    category: "Process",
    author: "Tech Maths delivery team",
    publishedOn: "2025-09-18",
    readMinutes: 6,
    download: true,
    tags: ["rack-and-stack", "documentation", "handover"],
    body: `A rack elevation looks like the least interesting document in a build. It is a rectangle with lines in it. That is exactly why it causes more disputes than any other artefact in a data center project.

When an elevation is treated as a sketch, three things happen. First, decisions that should have been made on paper get made on the floor, by whoever is holding the screwdriver. Second, changes happen silently — a network switch moves two U because a rail kit would not fit, and nobody updates the drawing. Third, at handover, the documentation describes a rack that no longer exists.

## What "signed" actually means

A signed elevation is a statement about four things, and if any of them are missing it is not a plan, it is a hope.

- **Position and orientation.** Every U is assigned, including the blank ones. Airflow direction is explicit, not assumed from a photo of the front.
- **Power.** Which device is on which PDU, and which feed. A/B assignment written down, not decided when someone notices both cords came out of the same strip.
- **Weight and load.** Heavy items low, load distributed against the rack rating and the floor loading spec. This is a safety decision, not an aesthetic one.
- **Cable entry and service loops.** Where cable enters, how much slack is left, and how it will be dressed. Retrofitting this later means pulling devices.

## The deviation log is the point

Plans survive contact with reality badly, and pretending otherwise is how you lose an evening. The useful discipline is not a perfect plan — it is a rule that nothing changes without being recorded.

Every deviation gets a line: what changed, why, who approved it, and when. Two consequences follow. The engineer on the floor stops having to make silent judgement calls, because logging is faster than arguing. And at handover, the as-built matches the physical rack because the drawing was updated as reality diverged from it.

> If your contractor hands you as-built documentation with no deviation log, you should ask a follow-up question: either nothing changed, which is implausible, or the changes were never written down.

## Make it a deliverable, not a drawing

The practical move is contractual. Elevations are a deliverable with an approval step before mobilisation, and an as-built revision issued at handover. Both are dated, both are versioned, and both are attached to the acceptance pack.

Once the elevation is a deliverable rather than a convenience, most build disputes disappear — because the disagreement that would have happened in week six now happens in week one, on paper, when it costs nothing to fix.`,
  },
  {
    slug: "certify-every-link",
    position: 2,
    title: "Certify every link, or accept that you have no results",
    excerpt:
      "Sampled certification is a common cost saving that produces a test report nobody can rely on. Here is what full certification costs, and what it buys.",
    kind: "article",
    category: "Structured cabling",
    author: "Ana Ferreira, Head of Structured Cabling",
    publishedOn: "2025-08-27",
    readMinutes: 5,
    download: false,
    tags: ["structured-cabling", "certification", "quality"],
    body: `A cabling contractor offers to certify 10% of links instead of 100%. The saving is real and the reasoning sounds plausible: if the workmanship is consistent, a sample proves the batch.

The problem is that cabling failures are rarely systemic. They are individual: one termination with a nicked conductor, one bend radius crushed under a tray, one connector with contamination on the end-face. A 10% sample does not detect these. It detects only the failure mode you did not have.

## What a sample actually tells you

Sampled testing answers a narrower question than people assume. It tells you the installer's average workmanship was acceptable on the links they happened to pick. It does not tell you which links pass, which is the question your operations team asks when something fails at 02:00.

With full certification you get a per-link result. When a link misbehaves you can look up whether it was tested, when, and at what margin. With a sample you get a statistical statement and a guess.

## The native export matters

Ask for the certifier's native file export, not only a PDF summary. Native exports carry the tester, serial, calibration date and per-parameter results, which is what makes them defensible in a warranty or dispute conversation. A PDF can be regenerated from anything.

Two related habits are worth insisting on:

- **Calibration evidence.** A certifier out of calibration produces confident nonsense. Ask for the calibration certificate covering the test period.
- **Failures stay visible.** The contractor who hands you 100% pass results with no re-terminations recorded has either done flawless work or has quietly replaced the failures. Both re-test evidence and the original failure belong in the pack.

## What full certification costs

Roughly, certification adds between five and ten percent to a cabling labour cost depending on link count, fibre type and how much rework the first pass uncovers. On a 14,000-link refresh, that is a rounding error against the cost of one unplanned outage traced to an uncertified link.

The decision is not really about test coverage. It is about whether, at handover, you receive a document that describes your cabling — or a document that describes a sample of it.`,
  },
  {
    slug: "decommissioning-checklist-audit",
    position: 3,
    title: "A decommissioning checklist that survives an audit",
    excerpt:
      "The twelve checkpoints that separate a tidy asset removal from one that produces findings, missing drives and an uncomfortable conversation with security.",
    kind: "checklist",
    category: "Decommissioning",
    author: "Tech Maths delivery team",
    publishedOn: "2025-08-05",
    readMinutes: 7,
    download: true,
    tags: ["decommissioning", "security", "NIST 800-88"],
    body: `Decommissioning goes wrong in the same handful of places, almost every time. Not because it is technically hard — de-racking a server is not hard — but because the paperwork and the reconciliation are treated as an afterthought.

This is the checklist we run on every decommissioning and migration job. Use it as-is or adapt it; the sequence is what matters.

## Before anything is touched

1. **Full inventory with serial capture.** Every asset recorded by serial, make, model and location before removal. This is the baseline the whole job reconciles against.
2. **Media inventory as a separate list.** Drives, tapes, SSDs and any removable media listed individually. Media is where audits go wrong, so it is tracked at drive level, not device level.
3. **Sanitisation policy agreed in writing.** Which method for which media class — cryptographic erase, degauss or physical destruction — and what evidence you will receive. NIST SP 800-88 gives you the vocabulary; the written agreement is what protects you.
4. **High-risk items flagged.** Licensed hardware, assets under finance agreement, anything with export controls, anything holding personal data. These get named owners.
5. **Rollback position defined.** For migrations: what happens if batch three fails at 04:00. Written down before the window opens.

## During removal

6. **Reconciliation at every handover point.** Assets counted when they leave the rack, when they are packed, when they are loaded, when they arrive. A discrepancy found at the van is a conversation; found three weeks later, it is an incident.
7. **ESD and transport standards.** Anti-static packaging, shock and tilt indicators on sensitive equipment, and packing that survives being handled by people who have never seen the asset list.
8. **Chain of custody signed at each transfer.** Who had it, when, and what they did with it. This is the document your security team will ask for.

## Evidence and closure

9. **Per-drive sanitisation evidence.** Serial, method, timestamp, operator, and a verification result. Batch certificates are weaker than per-drive records and auditors know it.
10. **Certificates of destruction and recycling.** Issued per batch with serial ranges, from the facility that actually performed the work.
11. **Reconciliation report.** What left, what arrived, what was destroyed, what is unaccounted for. If the last column is not zero, the job is not finished.
12. **Facility reinstatement.** Containment closed, cable routes cleared, penetrations sealed, floor tiles replaced. The vacated space should look untouched.

## The one question that finds problems

Ask your provider this: *"If one drive went missing tomorrow, what document would tell us where it was last seen?"*

If the answer is a batch certificate, you do not have a chain of custody. If it is a signed transfer record with a timestamp and a name, you do.`,
  },
  {
    slug: "prove-failover-dont-claim-it",
    position: 4,
    title: "Prove failover instead of claiming it",
    excerpt:
      "Redundancy on a design document and redundancy under load are different things. A practical method for testing the second, without breaking the first.",
    kind: "article",
    category: "Commissioning",
    author: "Miguel Costa, Lead Network Engineer",
    publishedOn: "2025-07-14",
    readMinutes: 6,
    download: false,
    tags: ["commissioning", "network", "testing"],
    body: `Every data center claims redundancy. Most have never tested it under conditions resembling a real failure.

The gap matters because redundancy is a behavioural property, not a component count. Two power feeds only work as redundancy if the failover completes inside the tolerance of the equipment above them. Two fabrics only work if reconvergence happens before your application gives up. The design document cannot tell you this. Removing the thing can.

## Test by removal, not by inspection

The core discipline is simple: for every redundancy claim, remove one side and measure.

- **Power:** remove feed A on a representative sample of devices, measure whether the device survives and for how long. Then do feed B — because A/B assignment errors are common and testing only A hides them.
- **Network:** take down a single link, then a full uplink bundle, then a device. Measure reconvergence each time and compare it to your contractual target.
- **Cooling:** simulate the loss of a unit and observe inlet temperatures against ASHRAE guidance, with logging rather than a handheld reading.
- **Storage:** pull a path, then a controller, and measure the application-level impact rather than the array's opinion of itself.

## Make the failure realistic

Two habits separate useful failover testing from theatre.

**Fail it the way it would actually fail.** A clean shutdown of a device is not the same as a power loss. Planned removals often hide the exact behaviour you care about, which is what happens during an unplanned one.

**Test with load on.** A fabric that reconverges in 200ms idle may take three seconds under production traffic. If you cannot test at full production load, test at the highest load you can justify and say so in the report.

## When a test fails — the useful part

Failures are the reason you tested. What matters is what happens next.

Record it with severity, owner and a re-test date. Do not mark it passed because go-live is close. If it cannot be fixed before handover, state it in writing as residual risk with a mitigation and a date. A client who knows about a 900ms reconvergence on one path can plan around it; a client who discovers it during an incident cannot.

> The best outcome of a failover test is a short list of things that did not work, found before go-live. A commissioning report with zero findings is either a very good design or an untested one.

## What to keep

For each scenario: what was removed, the measured recovery time, the target, the observed behaviour, and evidence. Over time that pack becomes something more valuable than a commissioning document — it becomes the answer to a customer question you would otherwise have to answer with adjectives.`,
  },
  {
    slug: "esd-control-six-things-auditors-check",
    position: 5,
    title: "ESD control on site: the six things auditors actually check",
    seoTitle: "ESD control: six things auditors check",
    excerpt:
      "Electrostatic damage is invisible, cumulative and expensive. These six checks cover most of what an audit looks at, and most of what goes wrong.",
    kind: "checklist",
    category: "Safety & quality",
    author: "Tech Maths delivery team",
    publishedOn: "2025-06-22",
    readMinutes: 5,
    download: true,
    tags: ["ESD", "safety", "quality"],
    body: `ESD damage rarely announces itself. A component that survives a static event often fails weeks later, in production, with no obvious cause. That makes ESD control both boring and economically important — and it makes it easy to fake, which is why auditors look at evidence rather than intentions.

These are the six things that get checked.

## 1. Wrist straps that are actually worn and tested

Not present in the kit — worn, and verified. A strap with a broken cord or a poor skin contact reads as compliance while doing nothing. Continuous monitors on benches where the work justifies them, and a daily test log where they are used.

## 2. Work surfaces that are not improvised

ESD-safe mats on benches, with a documented resistance test. The classic audit finding is a server board resting on antistatic packaging that was never designed to be a work surface, on a table that is not dissipative.

## 3. Packaging discipline

Components move in shielding bags, not in bubble wrap or cardboard. Bags are closed, not folded over. Anything leaving the hall — for RMA, for sanitisation, for transport — is packaged as if it matters, because the warranty claim depends on it.

## 4. Handling of boards and modules

Edges and brackets, not contacts and connector pins. Modules go in and out with the power state appropriate to the vendor's guidance. It sounds elementary; it is the single most commonly observed deviation on site.

## 5. Environment and humidity

Very low humidity increases charge generation. Where sites run dry, the mitigation is procedural — more frequent grounding checks, stricter packaging — and it should be written into the method statement rather than left to the crew's judgement.

## 6. Records that prove the above

Training records for the people on site, periodic test results for straps and mats, and a procedure that exists in writing. Auditors do not penalise a gap that is documented and controlled; they penalise a control that is claimed without evidence.

## The practical test

Walk into any data center floor and ask three questions: *is anyone touching a board right now, are they grounded, and can you show me the last test result for that strap?*

If the third question produces a shrug, the first two answers are opinions.`,
  },
  {
    slug: "scope-of-work-that-doesnt-change",
    position: 6,
    title: "How to write a data center scope of work that does not change",
    seoTitle: "How to write a data center scope of work",
    excerpt:
      "Scope creep in data center projects is usually a documentation failure, not a discipline failure. Eight sections that make the boundary explicit.",
    kind: "guide",
    category: "Process",
    author: "Tech Maths delivery team",
    publishedOn: "2025-05-30",
    readMinutes: 7,
    download: true,
    tags: ["procurement", "process", "contracts"],
    body: `Ask ten operations managers what ruins data center projects and most will say scope creep. Ask ten contractors and they will say clients changing their minds. Both are describing the same failure from different sides: the scope was never written down precisely enough for either party to know when it changed.

A scope of work is not a description of the work. It is a boundary. Here are the eight sections that make the boundary enforceable.

## 1. What is included, as a list of nouns

"Install the racks" is not a scope. "Assemble, level and anchor 40 racks to the supplied specification, fit rail kits, mount 480 devices, fit blanking panels to all unused U" is. Every line should be countable, so completion is a fact rather than a discussion.

## 2. What is excluded, explicitly

This is the section everyone skips and the one that prevents most disputes. Electrical works upstream of the PDU, structural floor reinforcement, licensing, customs, third-party certification — name them. An exclusion list is not defensive; it is the clearest possible statement of what you are buying.

## 3. Deliverables, with formats

As-built drawings in PDF and DWG. Asset register as CSV with named columns. Test results as native certifier export plus PDF. When the format is specified, "we sent you the documentation" stops being an opinion.

## 4. Method and quality gates

Which stages exist, what is checked at each, and what has to be approved before the next starts. Wave validation for volume builds; elevation approval before mobilisation; defect closure before acceptance.

## 5. Client obligations and dependencies

Site access windows, power and cooling readiness, credentials, approved hardware list, induction lead times, and who approves changes. Most schedule failures are dependencies nobody wrote down.

## 6. Change control

How a change is raised, priced, approved and recorded. Keep it light enough to actually use — a heavy process gets bypassed, and bypassed process produces undocumented changes.

## 7. Acceptance criteria

What "done" means, test by test. Include the failure path: what happens when a test fails, who owns the defect, and what the re-test commitment is.

## 8. Assumptions

Anything the price depends on that is not a deliverable: hardware available by a date, containment capacity as surveyed, access during stated hours. Assumptions are where risk lives, so put them in writing instead of in someone's head.

> A good test of a scope of work: hand it to two people who were not in the meeting and ask them what is excluded. If their answers differ, the document is not finished.

Written this way, scope changes still happen — they should, because reality changes. The difference is that they arrive as documented variations with a price and a date, instead of as an argument at handover.`,
  },
  {
    slug: "airflow-blanking-panels-three-degrees",
    position: 7,
    title: "Blanking panels, airflow and the three-degree problem",
    excerpt:
      "Recirculation is the most common thermal fault in a rack, and it is almost always caused by something that costs two euros to fix.",
    kind: "article",
    category: "Thermal",
    author: "Sofia Lindqvist, Commissioning & QA Lead",
    publishedOn: "2025-04-16",
    readMinutes: 5,
    download: false,
    tags: ["thermal", "rack-and-stack", "ASHRAE"],
    body: `A server inlet running three degrees warmer than its neighbour is usually not a cooling problem. It is a recirculation problem, and in most cases the cause is an empty U.

Hot air from the rear of the rack takes the path of least resistance. An unblanked U is an open door: exhaust air flows straight back into the cold aisle and is drawn into the intakes of the equipment above. The cooling plant is doing its job; the rack is undoing it.

## Why it hides

Recirculation is invisible until something trips. Servers compensate by increasing fan speed, which raises power draw and noise, and the effect is attributed to a hot aisle or an underperforming CRAC unit. Meanwhile the actual fault is a missing plastic panel.

Two patterns make it worse:

- **Empty U between hot devices.** Heat sources separated by gaps create localised recirculation paths that do not show up in aisle-level temperature readings.
- **Inconsistent airflow orientation.** A single device mounted back-to-front will exhaust into the cold aisle and feed its own intake. It is a ten-second error at install time and a persistent fault afterwards.

## What to check on a walk-through

You do not need instruments to find most of it.

1. Every unused U has a blanking panel, including at the top and bottom of the rack.
2. All devices face the same direction, with exhaust to the hot aisle.
3. Cable dressing does not block rear exhaust paths — cable management arms and bundles directly behind fans are a common and avoidable restriction.
4. Floor tiles and containment are as designed, with no open tiles in the cold aisle acting as bypass paths.
5. Inlet temperatures sit within the ASHRAE recommended range for the equipment class, measured at the intake, not in the aisle.

## Measure at the intake

Aisle temperature is a facility metric. Inlet temperature is an equipment metric, and the two can differ by several degrees in the same rack. If you only have aisle readings, you have no visibility of the exact thing that causes thermal shutdowns.

A thermal survey with logged inlet and outlet temperatures per rack takes an afternoon and usually pays for itself in the first fan-speed reduction. It also produces a baseline, which is what makes the next thermal complaint diagnosable instead of anecdotal.

## The cheap fix is genuinely cheap

Blanking panels, corrected airflow orientation and tidied cable routes cost almost nothing and are often a half-day of work across a hall. The expensive part is not the fix — it is the months of elevated fan power and unexplained thermal alerts that happen because nobody walked the aisle looking for empty U spaces.`,
  },
  {
    slug: "remote-hands-sla-what-to-contract",
    position: 8,
    title: "Remote hands SLAs: what to put in the contract",
    excerpt:
      "Response time is the number everyone negotiates and the one that matters least. These clauses decide whether the service actually works.",
    kind: "guide",
    category: "Field support",
    author: "Tomasz Wójcik, Field Support Manager CEE",
    publishedOn: "2025-03-11",
    readMinutes: 6,
    download: true,
    tags: ["remote-hands", "SLA", "contracts"],
    body: `Every remote hands contract argues about response time. Almost none argue about the clauses that determine whether the service is any good.

Response time matters, but it is the easiest number to promise and the hardest to verify. The following clauses are the ones that separate a service that helps from a service that generates tickets.

## Define the task catalogue

"Remote hands" covers anything from reading an LED to replacing a motherboard. List the task types, and split them into procedural and skilled. Procedural tasks are executed as instructed. Skilled tasks require an engineer who understands the platform, and should be priced accordingly — otherwise you will be sent whoever is nearest rather than whoever is capable.

## Evidence as a deliverable, not a courtesy

Specify what closure means: photographs before and after, console output where relevant, timestamps, and the reference number on every item. This clause alone changes the character of the service, because it makes the work auditable without you being present.

## Access and induction lead times

If your site requires 24 hours' notice for access, a two-hour response commitment is fiction. State your induction and access process in the contract, and make the SLA clock start from confirmed access rather than from ticket creation. Both sides benefit from an honest clock.

## Change control boundaries

State explicitly what the provider may not do: no configuration changes without a change record, no production reboots without approval, no undocumented cable moves. A provider that treats this as optional will eventually make a change you did not authorise, at a time you did not choose.

## Spares and chain of custody

If the provider holds spares, specify the stock list, replenishment thresholds, and the movement log. If they handle media or assets, specify chain-of-custody records and sanitisation methods. Missing spares turn a two-hour fix into a two-day outage.

## Escalation with names

Not "escalate to the account manager" but a named path with timeframes: engineer to duty lead at 30 minutes, to account lead at two hours, to delivery director at four. When something goes wrong at 02:00, an escalation path with names is worth more than an SLA percentage.

## Reporting that you can act on

Monthly reporting should include SLA performance, task mix, recurring faults and recommendations. The recurring-fault section is the valuable one: it is how a provider demonstrates they are removing work rather than billing it.

## Exit

State what you receive on termination: task history, spares reconciliation, documentation of any changes made on your estate, and the return of anything held on your behalf. Nobody negotiates the exit clause while the relationship is good, and everybody needs it later.

> The shortest useful test of a remote hands contract: *what document will we receive after a task, and who will call us if it cannot be completed as instructed?* If both answers are specific, the contract is probably sound.`,
  },
];
