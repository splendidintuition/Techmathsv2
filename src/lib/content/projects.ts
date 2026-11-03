import type { Project } from "../types";

/**
 * Case studies.
 *
 * EVERY project here is illustrative (`isPlaceholder: true`) and is rendered on
 * the site with a visible "Illustrative reference" marker. Replace with real,
 * permissioned client references before launch — see docs/HANDOVER.md.
 */
export const PROJECTS: Project[] = [
  {
    slug: "frankfurt-hyperscale-fit-out",
    position: 1,
    title: "420-rack hyperscale fit-out, Frankfurt",
    client: "Hyperscale provider — placeholder",
    summary:
      "Three data halls brought to production in a single quarter, with configuration drift controlled by wave-based validation rather than end-of-project inspection.",
    services: ["rack-and-stack", "structured-cabling", "server-installation", "commissioning-testing"],
    industries: ["hyperscale", "colocation"],
    country: "DE",
    region: "DACH",
    year: 2024,
    duration: "11 weeks",
    teamSize: 14,
    challenge:
      "The client had committed to a capacity launch date with three halls still empty. Their in-house team could not scale past 40 racks a week, and the vendor hardware was arriving in overlapping shipments with inconsistent firmware levels. The real risk was not speed — it was installing 420 racks at four different firmware baselines and discovering it at acceptance.",
    scope: [
      "Rack assembly and device mounting across three halls, 420 racks",
      "Cat 6A and OS2 structured cabling with 100% link certification",
      "Server population, firmware baseline and BIOS/BMC configuration",
      "Wave-based build with validation gates between waves",
      "Burn-in across all nodes with per-serial results",
      "Full acceptance testing including power-path and failover verification"
    ],
    result:
      "All three halls reached acceptance eleven weeks after mobilisation, on the committed date. Because firmware versions were recorded per node from the first wave, a vendor firmware defect was caught in week two on 36 units instead of at acceptance across 3,100. Zero racks required rework after handover.",
    metrics: [
      { value: "420", label: "racks delivered" },
      { value: "3,100+", label: "servers installed" },
      { value: "11 wks", label: "to acceptance" },
      { value: "0", label: "post-handover reworks" }
    ],
    quote:
      "The wave gates were the difference. They found a firmware defect in week two that would have cost us the launch date in week eleven.",
    isPlaceholder: true,
  },
  {
    slug: "lisbon-colocation-customer-deployments",
    position: 2,
    title: "Rolling customer deployments, Lisbon colocation",
    client: "Colocation provider — placeholder",
    summary:
      "A standing delivery partnership absorbing customer deployment requests the provider's in-house team could not schedule, executed to the facility's own standard and paperwork.",
    services: ["rack-and-stack", "structured-cabling", "remote-smart-hands"],
    industries: ["colocation"],
    country: "PT",
    region: "Iberia",
    year: 2024,
    duration: "Ongoing since 2022",
    teamSize: 6,
    challenge:
      "Customer deployment requests arrived in bursts — eight in one month, none for six weeks. Hiring for the peak left a team idle; ignoring the peak meant customers waited, and waiting customers move. The provider needed surge capacity that still looked, documented and behaved like their own team.",
    scope: [
      "On-call deployment crews for customer rack installs",
      "Cross-connect and meet-me-room work under facility procedure",
      "Certified cabling to the provider's label scheme",
      "Deployment packs issued in the provider's own document template",
      "Remote hands cover for out-of-hours customer requests",
      "Monthly SLA and quality reporting to the operations director"
    ],
    result:
      "Customer deployment lead time dropped from an average of 19 days to 6. The provider's in-house engineers were released to facility projects, and no deployment in three years has been rejected at the provider's own quality review.",
    metrics: [
      { value: "19 → 6", label: "days average lead time" },
      { value: "240+", label: "deployments delivered" },
      { value: "0", label: "quality-review rejections" },
      { value: "3 yrs", label: "continuous partnership" }
    ],
    quote:
      "Our customers cannot tell the difference. That was the requirement, and it is the result.",
    isPlaceholder: true,
  },
  {
    slug: "london-financial-services-migration",
    position: 3,
    title: "Two server rooms migrated in one weekend, London",
    client: "Financial services firm — placeholder",
    summary:
      "A consolidated move of two legacy server rooms into a colocation suite over a single 54-hour window, with rollback positions agreed before anything was de-racked.",
    services: ["decommissioning-migration", "rack-and-stack", "network-connection", "commissioning-testing"],
    industries: ["enterprise"],
    country: "GB",
    region: "UK & Ireland",
    year: 2023,
    duration: "54-hour window, 7 weeks preparation",
    teamSize: 11,
    challenge:
      "Two server rooms, 38 racks of mixed-age hardware, undocumented cabling and a business that could not be offline past Monday 06:00. Legacy equipment had no current spares, and two applications had no tested failover. The client's instinct was a big-bang move; the risk profile said otherwise.",
    scope: [
      "Full pre-move inventory and serial reconciliation of 38 racks",
      "Staged migration plan with three batches and defined rollback positions",
      "New racks, structured cabling and network bring-up at the destination",
      "Out-of-hours de-rack, transport with shock monitoring, and re-installation",
      "Post-move certification and acceptance testing before business hours",
      "Decommissioning of the vacated rooms with media sanitisation to policy"
    ],
    result:
      "The migration completed at 03:40 on Sunday, twenty hours inside the window. Two applications were reverted to the rollback position when post-move validation failed, then migrated successfully in the second batch — the plan absorbed the failure instead of the business absorbing it. All 412 drives sanitised with per-drive certificates.",
    metrics: [
      { value: "38", label: "racks migrated" },
      { value: "54h", label: "business window" },
      { value: "412", label: "drives sanitised & certified" },
      { value: "20h", label: "inside the deadline" }
    ],
    quote:
      "The rollback positions are why we signed. Nobody else put in writing how they would undo it.",
    isPlaceholder: true,
  },
  {
    slug: "amsterdam-fibre-refresh",
    position: 4,
    title: "14,000-link fibre and copper refresh, Amsterdam",
    client: "Network operator — placeholder",
    summary:
      "A live-facility cabling refresh replacing end-of-life OM3 with OM4 and OS2, delivered in occupied halls without a single unplanned customer outage.",
    services: ["structured-cabling", "commissioning-testing", "maintenance-field-support"],
    industries: ["telecom", "colocation"],
    country: "NL",
    region: "Benelux",
    year: 2024,
    duration: "16 weeks",
    teamSize: 9,
    challenge:
      "The facility was fully occupied throughout. Cable routes were saturated, some containment was undocumented, and the operator could not accept a single unplanned outage. A conventional rip-and-replace approach would have put live customer links at risk for four months.",
    scope: [
      "Route survey and containment capacity assessment across four halls",
      "New containment installation and route remediation",
      "14,000 links installed: OM4 multimode, OS2 singlemode and Cat 6A",
      "Live-service migration using pre-tested parallel paths",
      "100% certification with native test exports per link",
      "Administration rebuild to TIA-606-D with the operator's naming scheme"
    ],
    result:
      "Zero unplanned outages across 16 weeks of live-facility work. Every link certified with a native export, and 340 links that failed initial certification were re-terminated and re-tested on site. The as-built administration now matches the physical plant — the operator's first audit since the refresh closed with no cabling findings.",
    metrics: [
      { value: "14,000", label: "links installed" },
      { value: "100%", label: "certified, native exports" },
      { value: "0", label: "unplanned outages" },
      { value: "340", label: "re-terminations to pass" }
    ],
    quote:
      "They told us which links failed and re-tested them in front of us. That is not how our previous contractor worked.",
    isPlaceholder: true,
  },
  {
    slug: "warsaw-edge-rollout",
    position: 5,
    title: "62 edge sites across five countries",
    client: "Edge platform — placeholder",
    summary:
      "A standardised edge build delivered by rotating crews in Poland, Czechia, Germany, Austria and the Netherlands — one method, one documentation set, five countries.",
    services: ["rack-and-stack", "network-connection", "structured-cabling", "maintenance-field-support"],
    industries: ["edge", "telecom"],
    country: "PL",
    region: "Central & Eastern Europe",
    year: 2023,
    duration: "9 months",
    teamSize: 8,
    challenge:
      "62 sites, most in locations with no local specialist labour, each with a four-hour access window and heterogeneous conditions. The client's previous approach had produced 62 slightly different builds and no consistent documentation, which made support expensive and slow.",
    scope: [
      "Standardised build kit and documentation template for every site",
      "Rack build, network bring-up and uplink commissioning per site",
      "Cross-connect coordination with four different carriers",
      "Photographic and configuration evidence per site",
      "Central register of every site's as-built state",
      "Transition into SLA-based field support after build"
    ],
    result:
      "All 62 sites delivered to one documented standard, with average on-site time reduced from 11 hours to 7 as the kit and method matured. Support tickets in the first six months fell 41% against the client's prior estate, because every site was documented identically.",
    metrics: [
      { value: "62", label: "sites delivered" },
      { value: "5", label: "countries" },
      { value: "11 → 7h", label: "average on-site time" },
      { value: "−41%", label: "support tickets vs prior estate" }
    ],
    quote:
      "For the first time we could ask about any site and get the same answer format back.",
    isPlaceholder: true,
  },
  {
    slug: "dublin-fabric-commissioning",
    position: 6,
    title: "Production fabric bring-up and failover proof, Dublin",
    client: "Colocation provider — placeholder",
    summary:
      "Commissioning of a dual-fabric network across two halls, with redundancy proven by deliberate fault injection rather than accepted on the basis of a design document.",
    services: ["network-connection", "commissioning-testing"],
    industries: ["colocation", "hyperscale"],
    country: "IE",
    region: "UK & Ireland",
    year: 2024,
    duration: "6 weeks",
    teamSize: 5,
    challenge:
      "The design promised full redundancy across two independent fabrics. Nobody could demonstrate it. The client was being asked by their own customers for evidence of failover behaviour, and the only evidence available was the design document.",
    scope: [
      "Acceptance test plan written against the design and agreed with the client",
      "Fabric configuration verification and out-of-band management build",
      "Uplink, LACP and MLAG bring-up across two halls",
      "Deliberate fault injection: link, node and feed removal under observation",
      "Recovery time measurement against contractual targets",
      "Cross-connect schedule and carrier hand-off documentation"
    ],
    result:
      "Failover behaviour measured and documented for 34 failure scenarios, including two scenarios where recovery exceeded the contractual target. Those two were fixed before go-live rather than explained afterwards. The client now issues the test evidence pack directly to their own customers.",
    metrics: [
      { value: "34", label: "failure scenarios tested" },
      { value: "2", label: "target misses found & fixed" },
      { value: "< 400ms", label: "verified reconvergence" },
      { value: "1", label: "evidence pack reused for sales" }
    ],
    quote:
      "We stopped describing our redundancy and started sending the test results.",
    isPlaceholder: true,
  },
  {
    slug: "mumbai-hyperscale-build",
    position: 7,
    title: "3,000-server build-out, Mumbai",
    client: "Hyperscale provider — placeholder",
    summary:
      "A high-volume deployment delivered by local engineering teams in Mumbai to the same documentation and validation standard as our European operations.",
    services: ["rack-and-stack", "server-installation", "os-application-installation", "commissioning-testing"],
    industries: ["hyperscale"],
    country: "IN",
    region: "Asia-Pacific",
    year: 2025,
    duration: "8 weeks",
    teamSize: 22,
    challenge:
      "Volume, speed and consistency across a large local team. The client had previously experienced builds where documentation quality fell as volume rose, leaving them to reconcile the estate themselves after handover.",
    scope: [
      "180 racks built and populated across two halls",
      "3,000 servers installed with firmware and BIOS baselines",
      "Hypervisor cluster build and hardening to client baseline",
      "Wave validation with per-serial build records",
      "Burn-in and acceptance testing at volume",
      "Documentation produced in parallel, not reconstructed at the end"
    ],
    result:
      "Delivered on schedule with per-serial build records for all 3,000 units. Documentation completeness was audited at week four rather than at handover, which surfaced two labelling inconsistencies while they were cheap to fix. The client's post-handover reconciliation effort was close to zero.",
    metrics: [
      { value: "3,000", label: "servers deployed" },
      { value: "180", label: "racks built" },
      { value: "8 wks", label: "on schedule" },
      { value: "100%", label: "per-serial records" }
    ],
    quote:
      "Same standard as Europe. That was the whole point of using one partner.",
    isPlaceholder: true,
  },
  {
    slug: "ashburn-msp-remote-hands",
    position: 8,
    title: "SLA remote hands coverage for an MSP, US East",
    client: "Managed service provider — placeholder",
    summary:
      "A permanent remote and smart hands service replacing a full-time on-site role, with photo-evidenced closure on every task and monthly SLA reporting.",
    services: ["remote-smart-hands", "maintenance-field-support"],
    industries: ["edge", "enterprise"],
    country: "US",
    region: "Americas",
    year: 2025,
    duration: "Ongoing",
    teamSize: 4,
    challenge:
      "The MSP needed hands in Northern Virginia for a portfolio of customer racks. A permanent hire was expensive for the actual workload, and their previous ad-hoc vendor was unreliable on evidence — tasks closed with a one-line note and no proof of what was done.",
    scope: [
      "2-hour emergency and 4-hour standard response commitment",
      "Hardware swaps, reboots, cabling changes and console diagnostics",
      "Photo and timestamp evidence on every task",
      "Chain-of-custody for media and asset movements",
      "Spares held at hub with replenishment thresholds",
      "Monthly SLA report with trend analysis and recommendations"
    ],
    result:
      "1,400+ tasks closed in the first year at 98.6% within SLA. The MSP retired the planned full-time hire, and their customers now receive evidence packs that answer the 'prove it was done' question before it is asked.",
    metrics: [
      { value: "1,400+", label: "tasks closed in year one" },
      { value: "98.6%", label: "within SLA" },
      { value: "2h", label: "emergency response" },
      { value: "1", label: "permanent hire avoided" }
    ],
    quote:
      "The evidence pack ended the argument with our customers. It used to be our problem; now it is just a PDF.",
    isPlaceholder: true,
  },
];
