import type { Service } from "../types";

/**
 * The nine-service catalog. Copy is written to be technically credible to
 * data center operations managers, not marketing-generic.
 * Slugs are the public URLs: /services/<slug>.
 */
export const SERVICES: Service[] = [
  {
    slug: "rack-and-stack",
    position: 1,
    title: "Rack & Stack",
    short: "Rack assembly, rail kits, server and switch mounting, load-balanced placement and labelling to a documented standard.",
    icon: "rack",
    summary:
      "Rack & stack is where a design becomes physical. We build the rack the way the drawings say it should be built — load distribution, cable entry, airflow direction, PDU assignment, service loops — and we document what we actually installed so the next engineer does not have to guess.\n\nOur crews work from your elevation drawings when you have them, and produce them when you do not. Every unit is placed against a written rack elevation, every device gets a printed label, and every change on site is fed back into the as-built pack before we leave the floor.",
    included: [
      "Rack assembly, levelling, seismic and anti-tip kit where specified",
      "Rail kit fitting for server, storage, PDU and shelf hardware",
      "Device mounting with correct airflow orientation and cold-aisle alignment",
      "Weight and load distribution planning against the rack and floor loading spec",
      "Dual-feed PDU assignment and A/B power cord routing",
      "Blanking panels fitted on every unused U to protect airflow",
      "Machine-printed labels for devices, ports, power feeds and rack ID",
      "As-built rack elevation sheets returned as PDF and DWG"
    ],
    excluded: [
      "Structural floor reinforcement and seismic certification",
      "Electrical works upstream of the rack PDU",
      "Hardware procurement and warranty registration (available on request)",
      "Any works requiring a licensed electrical contractor in-country"
    ],
    deliverables: [
      "Rack elevation drawings (as-built, PDF + DWG)",
      "Asset register with serial numbers, rack/U position and PDU outlet",
      "Photo pack of each completed rack: front, rear, label detail",
      "Deviation log — anything that changed on site and why"
    ],
    method: [
      { title: "Elevation review", detail: "We check your drawings against the hardware list, rack internals and power feeds, and raise conflicts before mobilisation rather than on the floor." },
      { title: "Staging and check-in", detail: "Hardware is unpacked, inspected against the packing list, serials captured and damaged units quarantined before anything enters the live hall." },
      { title: "Rack build", detail: "Rails, shelves and PDU brackets first, then devices bottom-up by weight, with airflow orientation verified per device." },
      { title: "Power and labelling", detail: "A/B feed assignment, cord dressing to the rack standard, and printed labels applied as devices go in — not retrofitted at the end." },
      { title: "Verification", detail: "Position, orientation, feed assignment and labels checked against the elevation, unit by unit." },
      { title: "As-built handover", detail: "Drawings updated, asset register exported, photo pack attached and deviations logged with the reason." }
    ],
    tooling: [
      "Torque-controlled drivers and calibrated torque wrenches",
      "ESD-safe work surfaces, wrist straps and continuous monitors",
      "Laser distance measures and rack levelling instruments",
      "Thermal label printers and cable-ID print systems",
      "Rack elevation and asset capture tooling"
    ],
    standards: [
      "TIA-606-D administration and labelling",
      "TIA-942 / EN 50600 rack and cabling practices",
      "ANSI/ESD S20.20 handling controls",
      "Client rack standard where one exists"
    ],
    faqs: [
      { q: "Can you work from our drawings, or do you produce them?", a: "Both. If you have elevations we build to them and return an as-built revision. If you have a hardware list only, we produce the elevation for your approval before the crew mobilises." },
      { q: "How many racks can a crew complete per day?", a: "For a standard 42U build with mixed server and network hardware, a two-person crew typically completes four to six racks per shift including labelling and documentation. Dense storage or high-count network builds run lower." },
      { q: "Do you handle the hardware logistics?", a: "We can receive, check in and store hardware on your behalf, and we capture serial numbers on arrival. Full freight forwarding and customs handling is available as an add-on." },
      { q: "What happens when something on site does not match the plan?", a: "We stop, log it in the deviation log, propose the fix and get your approval before proceeding. Nothing is silently re-planned." }
    ],
    kpis: [
      { value: "4–6", label: "racks per crew per shift" },
      { value: "100%", label: "U positions labelled" },
      { value: "Same day", label: "as-built elevation return" }
    ],
    keywords: ["rack and stack", "rack mounting", "server rack installation", "data center rack build", "rack and stack Europe", "rack and stack Germany", "rack and stack UK"]
  },
  {
    slug: "structured-cabling",
    position: 2,
    title: "Structured Cabling",
    short: "Copper and fibre builds, containment, patching, labelling, certification and test results you can hand to an auditor.",
    icon: "cable",
    summary:
      "We install and certify copper and fibre to the standard your design calls for — Cat 6A, OM4/OM5 and OS2 — with containment, dressing and bend-radius discipline that keeps the hall maintainable for the next ten years.\n\nEvery permanent link is tested and certified, not just checked for a link light. You receive the full test results per link, with failures re-terminated and re-tested until they pass, and a labelling scheme that matches the administration standard you are already running.",
    included: [
      "Copper Cat 6/6A horizontal cabling, termination and patching",
      "Fibre OM3/OM4/OM5 multimode and OS2 singlemode installation",
      "MPO/MTP trunking, breakout harnesses and cassette installs",
      "Containment: overhead tray, underfloor, basket and conduit routing",
      "Cable dressing, separation of copper and fibre, bend-radius control",
      "Patch panel build-out and cross-connect management",
      "Fluke DSX / OptiFiber certification testing with per-link results",
      "Administration labels to TIA-606-D and your naming convention"
    ],
    excluded: [
      "Containment supply outside the agreed bill of materials",
      "Structural penetrations and fire stopping certification",
      "Active optics and transceiver supply (installable on request)",
      "Splice closure and outside-plant fibre works"
    ],
    deliverables: [
      "Certification test results per permanent link (native tester export + PDF)",
      "Fibre loss budget and OTDR traces where specified",
      "As-built cabling schedules and patching tables",
      "Photographic record of containment, terminations and labelling"
    ],
    method: [
      { title: "Survey and route design", detail: "We walk the routes, verify containment capacity and produce a cable schedule with lengths, types and label identifiers before ordering anything." },
      { title: "Containment and pulling", detail: "Routes are prepared, pull strings set and cable drawn with controlled tension and bend radius recorded as we go." },
      { title: "Termination", detail: "Copper terminated to the specified standard, fibre spliced or connectorised in a controlled, ESD-safe, dust-managed workspace." },
      { title: "Certification", detail: "Every permanent link tested with a calibrated certifier. Failures are re-worked and re-tested — we do not hand over a partial pass." },
      { title: "Administration", detail: "Labels applied at both ends plus intermediate identifiers, schedules built, patching recorded." },
      { title: "Handover", detail: "Test results, schedules and photos issued as a single pack, with failures and re-tests documented for traceability." }
    ],
    tooling: [
      "Fluke DSX cable analysers for copper certification",
      "Fluke OptiFiber Pro OTDR / loss testers",
      "Fusion splicers and ESD-safe cleaving stations",
      "Controlled-tension cable pulls and fish rods",
      "Torque and inspection scopes for connector end-face verification"
    ],
    standards: [
      "TIA-568.2-D and TIA-568.3-D cabling performance",
      "ISO/IEC 11801 and EN 50173 series",
      "TIA-606-D administration",
      "ANSI/ESD S20.20 and IEC 61340 handling",
      "BICSI installation practices"
    ],
    faqs: [
      { q: "Do you certify every link or sample?", a: "Every permanent link, 100%. Test results are exported natively from the certifier so they cannot be edited, and we hand over the raw export alongside the PDF summary." },
      { q: "Can you work to our existing label scheme?", a: "Yes — send the naming convention and we build to it. If you do not have one, we propose a TIA-606-D compliant scheme for approval before termination starts." },
      { q: "What happens to links that fail certification?", a: "Re-terminated and re-tested on site at no extra charge. Both the failure and the re-test appear in the results so the record is complete." },
      { q: "Do you supply the cable and components?", a: "We can, from your approved vendor list, or install client-supplied materials. Either way we check in and record every reel and component received." }
    ],
    kpis: [
      { value: "100%", label: "links certified" },
      { value: "Cat 6A", label: "to 500 MHz" },
      { value: "OTDR", label: "fibre traces on request" }
    ],
    keywords: ["structured cabling", "fibre installation", "cable certification", "Cat 6A installation", "data center cabling", "structured cabling Europe", "fibre patching"]
  },
  {
    slug: "server-installation",
    position: 3,
    title: "Server Installation",
    short: "Physical install, ESD-controlled handling, firmware baseline, BIOS/BMC configuration and burn-in before handover.",
    icon: "server",
    summary:
      "Hardware in the rack is only half the job. We mount it, cable it, and bring it to a known-good firmware and configuration baseline so your platform team receives machines that are already consistent.\n\nWork is done against your configuration template where you have one. Where you do not, we propose a baseline covering firmware levels, BIOS settings, BMC network and credentials, boot order and power redundancy, and we run a documented burn-in so infant failures surface before the handover, not after go-live.",
    included: [
      "Unboxing, inspection and serial capture against the packing list",
      "Rail and device mounting with airflow and load checks",
      "Memory, drive and riser population to the build specification",
      "Firmware and driver baseline applied across all nodes",
      "BIOS/UEFI configuration: power profile, virtualisation, boot order, secure boot",
      "BMC/iDRAC/iLO network assignment, credential setting and access verification",
      "Power and network connection with A/B redundancy verification",
      "Burn-in and diagnostic cycles with results logged per serial number"
    ],
    excluded: [
      "Licensing procurement and entitlement management",
      "Application-level tuning beyond the agreed baseline",
      "RMA logistics for DOA hardware (we raise and document the case)",
      "Destructive media handling of decommissioned drives (see decommissioning)"
    ],
    deliverables: [
      "Per-serial build record: firmware levels, BIOS settings, BMC address",
      "Burn-in and diagnostic results per node",
      "Exception report for DOA, damaged or non-conforming units",
      "Photographic evidence of population, cabling and labelling"
    ],
    method: [
      { title: "Baseline agreement", detail: "Firmware targets, BIOS policy and BMC settings agreed and versioned before the first machine is opened." },
      { title: "Staged build", detail: "Population and mounting in batches so faults in the specification are caught on the first units, not the last hundred." },
      { title: "Firmware and BIOS", detail: "Baseline applied uniformly with the applied version recorded per node — no silent version drift." },
      { title: "BMC provisioning", detail: "Management networks assigned, credentials set to your policy, and access verified from a management workstation." },
      { title: "Burn-in", detail: "Memory, CPU, storage and thermal stress cycles run to the agreed duration, with results captured per serial." },
      { title: "Exception handling", detail: "DOA and non-conforming units isolated, documented and raised for RMA, with the rack elevation updated to reflect reality." }
    ],
    tooling: [
      "Vendor management tooling: iDRAC, iLO, XCC, Redfish",
      "Vendor diagnostic suites and memory/stress utilities",
      "ESD-safe benches, straps and continuous monitors",
      "KVM consoles and out-of-band management access",
      "Torque-controlled tooling and calibrated drivers"
    ],
    standards: [
      "ANSI/ESD S20.20 handling controls",
      "Vendor firmware and BIOS baselines",
      "Client configuration standards and change control",
      "ISO 9001-aligned documentation practice"
    ],
    faqs: [
      { q: "Can you apply our existing build template?", a: "Yes. Send it as a document or a script and we apply it verbatim, recording the template version against every node we build." },
      { q: "How long is a typical burn-in?", a: "Commonly 24 to 72 hours depending on platform and criticality. Shorter accelerated diagnostics are available for low-risk builds; we will tell you the trade-off rather than quietly shortening the cycle." },
      { q: "What if hardware arrives DOA?", a: "We isolate the unit, document the failure with evidence, update the asset register, and raise the RMA with the vendor. We do not install known-faulty hardware to hit a number." },
      { q: "Do you handle credentials securely?", a: "Credentials are set to your policy and transmitted only through the channel you specify. We never store production credentials in shared documents." }
    ],
    kpis: [
      { value: "24–72h", label: "typical burn-in window" },
      { value: "Per serial", label: "build records" },
      { value: "0", label: "known faults handed over" }
    ],
    keywords: ["server installation", "server deployment", "BIOS configuration", "BMC setup", "burn-in testing", "server installation Europe", "data center engineer"]
  },
  {
    slug: "os-application-installation",
    position: 4,
    title: "OS & Application Installation",
    short: "OS imaging, hypervisor build-out, hardening and application deployment aligned to your platform standard.",
    icon: "terminal",
    summary:
      "Once hardware passes burn-in, it needs an operating system that matches the rest of your estate. We deploy from your images and automation, or build a repeatable path when neither exists.\n\nThe output is a fleet that is consistent, hardened to the agreed profile, joined to your management plane, and documented well enough that your platform team can extend it without reverse-engineering our work.",
    included: [
      "OS deployment from client images, PXE or automation (Ansible, Foreman, SCCM)",
      "Hypervisor installation and cluster configuration (VMware, Hyper-V, KVM, Proxmox)",
      "Partitioning, storage zoning and multipath validation",
      "Hardening to CIS or client-specified baseline",
      "Domain join, NTP, DNS, monitoring agent and backup agent deployment",
      "Application runtime installation and configuration per spec",
      "Post-deployment validation against an agreed acceptance checklist",
      "Build documentation and repeatability notes handed to your team"
    ],
    excluded: [
      "Application code changes and custom development",
      "Licensing and entitlement management",
      "Long-term platform operations (see maintenance and field support)",
      "Data migration between applications (scoped separately)"
    ],
    deliverables: [
      "Deployment inventory: host, image, version, agents, validation state",
      "Hardening report against the agreed baseline",
      "Cluster and hypervisor configuration record",
      "Runbook for repeat deployment"
    ],
    method: [
      { title: "Standard capture", detail: "Your image, hardening profile and naming conventions captured and versioned. Gaps are listed, not assumed." },
      { title: "Path build", detail: "PXE or automation path validated on a small control batch before fleet-wide rollout." },
      { title: "Fleet deployment", detail: "Rollout in controlled waves with validation between waves so a configuration error never reaches the full fleet." },
      { title: "Hardening", detail: "Baseline applied and verified, with any deviation recorded and justified." },
      { title: "Validation", detail: "Acceptance checklist executed per host: services, agents, monitoring, backup, failover." },
      { title: "Knowledge transfer", detail: "Runbook and deviation list handed over so your team can extend the build unaided." }
    ],
    tooling: [
      "Ansible, Foreman, PXE and cloud-init automation",
      "VMware vSphere, Hyper-V, KVM and Proxmox",
      "CIS benchmark tooling and hardening scripts",
      "Monitoring and backup agent deployment tooling",
      "Configuration management and inventory systems"
    ],
    standards: [
      "CIS benchmark levels 1 and 2 where required",
      "Client build standards and naming conventions",
      "ITIL-aligned change control",
      "Vendor hardening guides for the target platform"
    ],
    faqs: [
      { q: "Do you need our images and automation?", a: "It helps but is not required. If you have images and PXE/Ansible we deploy from them. If not, we build a documented, repeatable path you own afterwards." },
      { q: "Which hypervisors do you work with?", a: "VMware vSphere, Microsoft Hyper-V, KVM, Proxmox and Nutanix AHV, plus bare-metal Linux and Windows Server estates." },
      { q: "How do you prevent a bad config reaching the whole fleet?", a: "Wave deployment. A control batch is validated before rollout continues, and each wave must pass the acceptance checklist." },
      { q: "Will you document what you did?", a: "Always. Deployment inventory, hardening report and a runbook are standard deliverables, not optional extras." }
    ],
    kpis: [
      { value: "Wave", label: "validated rollout" },
      { value: "CIS L1/L2", label: "hardening baselines" },
      { value: "Runbook", label: "included in handover" }
    ],
    keywords: ["OS installation", "server imaging", "virtualization deployment", "application deployment", "hardening", "hypervisor installation", "PXE deployment"]
  },
  {
    slug: "network-connection",
    position: 5,
    title: "Network Connection",
    short: "Switch and router bring-up, uplinks, VLANs, cross-connects and connectivity validation with evidence.",
    icon: "network",
    summary:
      "We bring up the network layer of a deployment: switch and router configuration, uplink commissioning, VLAN and port assignment, cross-connect ordering support and the end-to-end validation that proves the design works.\n\nEvery port we connect is tested and recorded. You receive a validated port map rather than a promise that it should work.",
    included: [
      "Switch and router configuration to the agreed design",
      "Uplink bring-up, LACP/MLAG and redundancy verification",
      "VLAN creation, port assignment and trunk configuration",
      "Routing configuration and route verification (static, OSPF, BGP basics)",
      "Cross-connect documentation and carrier hand-off support",
      "Out-of-band management network build and access testing",
      "Port map production: every port, its role, VLAN and test state",
      "End-to-end connectivity and throughput validation"
    ],
    excluded: [
      "Carrier cross-connect procurement (we prepare and support the order)",
      "Firewall policy design and security architecture",
      "IP address allocation policy (we implement the allocation you approve)",
      "WAN and SD-WAN architecture design"
    ],
    deliverables: [
      "Validated port map with per-port test results",
      "Device configuration backup and change record",
      "Redundancy and failover test evidence",
      "Cross-connect schedule and carrier references"
    ],
    method: [
      { title: "Design check", detail: "Port plan, VLAN map and addressing verified against the cabling schedule before any cable is patched." },
      { title: "Base configuration", detail: "Devices configured out of band, baselined, versioned and backed up before production traffic exists." },
      { title: "Uplink commissioning", detail: "Uplinks brought up with redundancy tested by deliberate failure, not assumed from a design document." },
      { title: "Port assignment", detail: "Access and trunk ports assigned to VLANs and patched against the port map, with each connection labelled at both ends." },
      { title: "Validation", detail: "Per-port connectivity, VLAN membership, routing and throughput tested; results attached to the port map." },
      { title: "Handover", detail: "Configuration backups, port map and test evidence issued, with a change record for anything adjusted on site." }
    ],
    tooling: [
      "Cisco IOS/NX-OS, Juniper Junos, Arista EOS, Mellanox/NVIDIA Cumulus",
      "Vendor SDN and fabric management platforms",
      "Console servers and out-of-band management access",
      "Traffic generators and throughput validation tooling",
      "Cable and fibre testers for physical layer verification"
    ],
    standards: [
      "IEEE 802.1Q VLAN and 802.3ad LACP",
      "Client network design and addressing standards",
      "ITIL change control for production devices",
      "TIA-606-D labelling for network administration"
    ],
    faqs: [
      { q: "Do you order cross-connects?", a: "We prepare the cross-connect schedule, verify meet-me-room references and support the order and hand-off. Procurement contracts stay with you or the carrier." },
      { q: "How do you prove redundancy works?", a: "By failing it deliberately. Uplinks and MLAG pairs are taken down under observation and the failover time recorded." },
      { q: "Can you work on live production fabric?", a: "Yes, under your change control with a documented rollback plan and a tested maintenance window. We will not make undocumented changes to a live fabric." },
      { q: "Which platforms do you support?", a: "Cisco, Juniper, Arista, NVIDIA/Mellanox, HPE Aruba Networking and white-box platforms running Cumulus or SONiC." }
    ],
    kpis: [
      { value: "Per port", label: "test evidence" },
      { value: "Deliberate", label: "failover testing" },
      { value: "Backed up", label: "before and after" }
    ],
    keywords: ["network installation", "switch configuration", "VLAN setup", "uplink commissioning", "cross connect", "network engineer data center", "network bring-up"]
  },
  {
    slug: "commissioning-testing",
    position: 6,
    title: "Commissioning & Testing",
    short: "End-to-end acceptance testing, documented results and a handover pack that stands up to audit.",
    icon: "check",
    summary:
      "Commissioning is the difference between an installed rack and an accepted one. We run the end-to-end tests that prove the deployment does what it was designed to do, and we document it in a pack your operations team and your auditors can both use.\n\nTesting covers power, cooling behaviour, network, storage and failover — with deliberate failure injection where the design claims redundancy. Claims are verified, not assumed.",
    included: [
      "Acceptance test plan authored against the design and agreed with you",
      "Power path verification: dual feeds, PDU assignment, failover behaviour",
      "Thermal and airflow verification with inlet/outlet temperature logging",
      "Network, storage and application-layer end-to-end validation",
      "Redundancy and failover testing through deliberate fault injection",
      "Cable and link certification result consolidation",
      "Defect register with severity, owner and closure status",
      "Handover pack: results, as-builts, asset register, runbooks, photo evidence"
    ],
    excluded: [
      "Electrical safety certification and statutory testing",
      "Cooling plant commissioning (Level 4/5 integrated systems testing)",
      "Third-party certification or sign-off",
      "Application performance testing beyond agreed acceptance criteria"
    ],
    deliverables: [
      "Signed acceptance test report with per-test results",
      "Defect register and closure evidence",
      "Consolidated handover pack in your document structure",
      "Go-live readiness statement with residual risks named"
    ],
    method: [
      { title: "Test plan", detail: "Acceptance criteria written before testing starts, agreed with you, and versioned. No test is invented at the last minute." },
      { title: "Environment check", detail: "Prerequisites verified: power, cooling, access, credentials, monitoring in place before test execution begins." },
      { title: "Execution", detail: "Tests run in sequence with results recorded live, including failures — the record is written as we go, not reconstructed." },
      { title: "Fault injection", detail: "Redundancy claims tested by removing feeds, links or nodes under observation, with recovery times measured." },
      { title: "Defect closure", detail: "Every failure raised with severity and owner, re-tested to closure, and the re-test evidence attached." },
      { title: "Handover", detail: "Pack assembled, walked through with your team, and residual risks stated in writing." }
    ],
    tooling: [
      "Acceptance test management and evidence capture",
      "Power quality and PDU monitoring",
      "Thermal logging probes and airflow measurement",
      "Network and storage validation suites",
      "Cable certification result consolidation"
    ],
    standards: [
      "ASHRAE thermal guidelines for inlet conditions",
      "TIA-942 / EN 50600 testing practice",
      "ISO 9001-aligned documentation and traceability",
      "ITIL-aligned change and release control"
    ],
    faqs: [
      { q: "Do you write the acceptance test plan?", a: "We do, based on the design documents and your operational requirements, and we agree it with you before testing starts. If you already have one, we execute against it." },
      { q: "What if a test fails near go-live?", a: "It goes in the defect register with severity, owner and a re-test date. We do not mark a failing test as passed, and we will state residual risk in writing." },
      { q: "Can you support an auditor or client witness?", a: "Yes. Witness tests are scheduled, evidence is captured live, and results are traceable back to the test plan line by line." },
      { q: "Do you handle electrical certification?", a: "No. Statutory electrical testing stays with a licensed contractor in-country. We verify the power path at the rack and consolidate their results." }
    ],
    kpis: [
      { value: "100%", label: "tests evidenced" },
      { value: "Injected", label: "faults, not assumed" },
      { value: "Written", label: "residual risk statement" }
    ],
    keywords: ["commissioning", "acceptance testing", "data center handover", "failover testing", "as-built documentation", "commissioning engineer", "UAT data center"]
  },
  {
    slug: "remote-smart-hands",
    position: 7,
    title: "Remote & Smart Hands",
    short: "On-demand hands in the hall: reboots, swaps, cable changes, visual checks and evidence back to you in minutes.",
    icon: "hand",
    summary:
      "Remote hands is the difference between a four-hour response and a four-day flight. Smart hands is the same engineer doing skilled work under your direction — console access, firmware, cabling changes, diagnostics.\n\nRequests are tracked with a reference, an SLA clock and a photo-evidenced closure. You get the same engineer quality as a project crew, on demand, without a standing contract.",
    included: [
      "Visual inspections, LED status checks and photographic evidence",
      "Device power cycles and controlled reboots",
      "Hardware swaps: drives, PSUs, fans, SFPs, cables",
      "Cable moves, patching changes and cross-connect re-patching",
      "Console and out-of-band access support for remote diagnosis",
      "Firmware and component-level tasks under your instruction",
      "Media handling and secure asset movement on site",
      "Evidence pack per task: photos, timestamps, reference"
    ],
    excluded: [
      "Architectural or design decisions on your behalf",
      "Changes without an approved instruction or change record",
      "Permanent on-site staffing (available as managed field support)",
      "Any task requiring local licensure we do not hold"
    ],
    deliverables: [
      "Task record with reference, timestamps and SLA performance",
      "Photographic evidence before and after",
      "Exception report where a task could not be completed as instructed",
      "Monthly SLA summary for contract accounts"
    ],
    method: [
      { title: "Request", detail: "You raise a task by portal, email or phone. A reference is issued immediately with an expected response time." },
      { title: "Triage", detail: "We confirm what is needed, what evidence you want back, and whether a change record is required before touching anything." },
      { title: "Mobilise", detail: "The nearest available engineer is assigned. For hub sites this is typically inside the agreed SLA window." },
      { title: "Execute", detail: "Work performed to instruction, with before/after photos and console output captured as evidence." },
      { title: "Verify", detail: "You confirm the outcome with us live, or we send the evidence pack for sign-off." },
      { title: "Close", detail: "Task closed against the reference with evidence attached and any deviation explained in writing." }
    ],
    tooling: [
      "Ticketing with SLA clock and reference tracking",
      "Console servers and KVM-over-IP access",
      "Photo and video evidence capture",
      "ESD-safe tooling and spare component kits",
      "Secure asset handling and chain-of-custody records"
    ],
    standards: [
      "ANSI/ESD S20.20 handling controls",
      "ITIL incident and change practice",
      "Client change-control and access procedures",
      "Chain-of-custody for media and assets"
    ],
    faqs: [
      { q: "What is the difference between remote hands and smart hands?", a: "Remote hands is procedural: reboot, swap, inspect, photograph. Smart hands is skilled work under your direction — console diagnostics, firmware, cabling changes — performed by an engineer who understands what they are looking at." },
      { q: "How fast can you respond?", a: "In hub locations, typically within the agreed SLA window, often inside two hours for emergency tasks. Non-hub sites depend on travel time, which we quote before you commit." },
      { q: "Do you work under our change control?", a: "Yes. We follow your change record and access procedures, and we will not perform an unrecorded change on a production device." },
      { q: "Can we use you ad hoc without a contract?", a: "Yes. Ad-hoc tasks are quoted per visit or per hour. Contract accounts get committed SLAs, named engineers and monthly reporting." }
    ],
    kpis: [
      { value: "< 2h", label: "hub-site emergency target" },
      { value: "Photo", label: "evidence on every task" },
      { value: "Named", label: "engineer per account" }
    ],
    keywords: ["remote hands", "smart hands", "data center support", "on-site engineer", "field engineer", "remote hands Europe", "remote hands Portugal", "emergency data center support"]
  },
  {
    slug: "decommissioning-migration",
    position: 8,
    title: "Decommissioning & Migration",
    short: "Asset removal, data-safe handling, site-to-site relocation and disposal with full chain of custody.",
    icon: "move",
    summary:
      "Removing equipment is easy. Removing equipment without losing an asset, a drive or an audit trail is the job.\n\nWe handle decommissioning and migration with chain-of-custody at every step: inventory before removal, serial reconciliation after, media handled to your data-sanitisation policy, and a certificate trail that satisfies your security and compliance teams. Relocations are planned as projects, with rollback positions and staged moves rather than one big-bang cut-over.",
    included: [
      "Pre-removal asset inventory and serial reconciliation",
      "Controlled shutdown coordination with your operations team",
      "De-racking, de-cabling and containment reinstatement",
      "Data-sanitisation to your policy (cryptographic erase, degauss, physical destruction)",
      "Packed, tracked transport with shock and tilt monitoring on request",
      "Staged site-to-site relocation with rollback positions",
      "Re-installation and re-commissioning at the destination",
      "Certificates: sanitisation, disposal, recycling and chain of custody"
    ],
    excluded: [
      "Legal title transfer and asset financial write-off",
      "Hazardous waste handling requiring specialist licensing",
      "Customs and export licensing (supported, not owned by us)",
      "Data recovery from failed media"
    ],
    deliverables: [
      "Reconciliation report: what left, what arrived, what was destroyed",
      "Certificates of sanitisation and disposal per asset or batch",
      "Chain-of-custody record end to end",
      "As-built state of the vacated and destination locations"
    ],
    method: [
      { title: "Inventory and risk review", detail: "Assets inventoried and reconciled before anything is touched, with high-risk items — drives, media, licensed hardware — flagged for special handling." },
      { title: "Plan and stage", detail: "Move sequenced in batches with rollback positions defined, so a failure at step four does not leave a site half empty." },
      { title: "Controlled removal", detail: "Shutdown coordinated with operations, devices de-racked and de-cabled with ESD controls, packed to transport standard." },
      { title: "Sanitisation", detail: "Media handled to the agreed method with evidence captured per drive, and certificates issued." },
      { title: "Transport and receipt", detail: "Tracked movement, receipt inspection at destination, and serial reconciliation against the removal inventory." },
      { title: "Recommission", detail: "Re-installation, re-cabling and re-testing at the destination, followed by a final reconciliation and certificate pack." }
    ],
    tooling: [
      "Asset inventory and serial capture systems",
      "Data sanitisation tooling with per-drive reporting",
      "Anti-static, shock-proof transport packaging",
      "Shock and tilt indicators for sensitive moves",
      "Chain-of-custody documentation systems"
    ],
    standards: [
      "NIST SP 800-88 media sanitisation guidance",
      "ADISA asset disposal practice",
      "WEEE and local environmental disposal regulations",
      "GDPR-aligned handling of personal data on media",
      "ANSI/ESD S20.20 handling controls"
    ],
    faqs: [
      { q: "How do you prove a drive was destroyed?", a: "Per-drive evidence: serial number, sanitisation method, timestamp and operator, plus a certificate. Physical destruction is photographed or witnessed if you require it." },
      { q: "Can you handle cross-border moves?", a: "Yes, including customs documentation support for moves between the EU, UK, US and India. Import/export licensing stays with you; we prepare the paperwork and coordinate the logistics." },
      { q: "Do you do big-bang moves?", a: "Only when there is no alternative. Our default is staged migration with rollback positions, because a single cut-over concentrates all of your risk into one night." },
      { q: "What happens if an asset goes missing?", a: "It stops the job. Reconciliation is done at every handover point precisely so that a discrepancy is found at the point of transfer, not weeks later." }
    ],
    kpis: [
      { value: "Per drive", label: "sanitisation evidence" },
      { value: "Staged", label: "moves with rollback" },
      { value: "NIST", label: "SP 800-88 aligned" }
    ],
    keywords: ["data center decommissioning", "server migration", "IT asset disposal", "drive destruction", "data center relocation", "NIST 800-88", "ADISA disposal"]
  },
  {
    slug: "maintenance-field-support",
    position: 9,
    title: "Maintenance & Field Support",
    short: "SLA-based field coverage: hardware replacement, scheduled health checks, spares handling and escalation.",
    icon: "wrench",
    summary:
      "Ongoing field coverage for operators and vendors who need an engineer on site without building a team. We work to a defined SLA with agreed response and resolution targets, spares logistics, and scheduled preventive work.\n\nBecause the same engineers who build your racks also maintain them, the person attending a fault already knows how the site was built and documented.",
    included: [
      "SLA-based response for hardware faults with agreed response and resolution targets",
      "Component and unit replacement: drives, PSUs, fans, memory, SFPs, nodes",
      "Scheduled preventive health checks and firmware currency reviews",
      "Spares stock management, replenishment and chain-of-custody",
      "Vendor escalation and RMA coordination",
      "Patch and cabling remediation from inspection findings",
      "Monthly reporting: incidents, SLA performance, trends, recommendations",
      "Named engineers and site familiarity over repeat visits"
    ],
    excluded: [
      "Vendor warranty terms and entitlement decisions",
      "Third-party maintenance contracts we do not hold",
      "Facilities plant maintenance (UPS, CRAC, generators)",
      "24/7 NOC monitoring (integrated via partners on request)"
    ],
    deliverables: [
      "SLA performance report with response and resolution metrics",
      "Incident records with root cause and closure evidence",
      "Spares inventory and movement log",
      "Recommendations report from recurring findings"
    ],
    method: [
      { title: "Coverage definition", detail: "Sites, hours, response and resolution targets, spares levels and escalation paths defined and agreed in writing." },
      { title: "Onboarding", detail: "Engineers walked through the site, the as-built documentation and your procedures before the first ticket arrives." },
      { title: "Response", detail: "Tickets acknowledged and attended inside the agreed window, with progress visible to your team throughout." },
      { title: "Resolution", detail: "Fault cleared, evidence captured, spares replenished and the incident closed with root cause recorded." },
      { title: "Preventive work", detail: "Scheduled health checks and firmware reviews run to plan, with findings fed back as recommendations." },
      { title: "Review", detail: "Monthly SLA and trend review, with recurring issues escalated into permanent fixes rather than repeat visits." }
    ],
    tooling: [
      "ITSM integration (ServiceNow, Jira Service Management, Zendesk)",
      "Vendor diagnostic suites and management platforms",
      "Spares inventory and chain-of-custody tracking",
      "ESD-safe tooling and field kits",
      "Reporting and SLA dashboards"
    ],
    standards: [
      "ITIL incident, problem and change practice",
      "ISO 9001-aligned service documentation",
      "ANSI/ESD S20.20 handling controls",
      "Client SLA and escalation procedures"
    ],
    faqs: [
      { q: "What SLAs do you offer?", a: "Commonly 4-hour response with next-business-day resolution for standard hardware, and 2-hour response for critical paths. Targets are set per site, because travel time between hubs and remote sites is not the same." },
      { q: "Do you hold spares on our behalf?", a: "Yes. We can hold spares at our regional hubs or on your site, with replenishment thresholds and a movement log." },
      { q: "Can you cover multiple sites under one agreement?", a: "That is the usual arrangement for operators and MSPs — a single agreement covering several sites with per-site response targets." },
      { q: "How do you stop the same fault recurring?", a: "Root cause is recorded on every incident and reviewed monthly. Recurring findings are escalated into a permanent fix with a recommendation, not attended again next month." }
    ],
    kpis: [
      { value: "4h / 2h", label: "standard / critical response" },
      { value: "Named", label: "engineers per site" },
      { value: "Monthly", label: "SLA and trend report" }
    ],
    keywords: ["data center maintenance", "field support", "SLA support", "hardware replacement", "remote hands contract", "field engineer Europe", "data center field services"]
  }
];
