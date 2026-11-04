"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Filter,
  Globe2,
  Info,
  MapPin,
  Navigation,
  Radio,
  Server,
  Shield,
  User,
} from "lucide-react";
import {
  COUNTRY_PATHS,
  HUB_POINTS,
  HQ_POINT,
  LAND_PATH,
  MAP_VIEWBOX,
} from "@/lib/content/worldmap";

export interface MapSite {
  id: string;
  name: string;
  city: string;
  country: string;
  code: string;
  x: number;
  y: number;
  tier?: string;
  activeTicketId?: string;
  activeTicketTitle?: string;
  engineer?: string;
  engineerStatus: "en_route" | "on_site" | "available" | "standby";
  eta?: string;
}

const DEFAULT_MAP_SITES: MapSite[] = [
  {
    id: "site-lis-01",
    name: "Start Campus Sines DC1",
    city: "Sines / Lisbon",
    country: "Portugal",
    code: "PT",
    x: 476.4,
    y: 167.7,
    tier: "Hyperscale Tier III",
    activeTicketTitle: "TM-2026-00041: Optical 400G Cross-connect Verification",
    engineer: "Alexandre Silva",
    engineerStatus: "on_site",
    eta: "On Site (Rack B12)",
  },
  {
    id: "site-fra-01",
    name: "Equinix FR2 / Main Campus",
    city: "Frankfurt",
    country: "Germany",
    code: "DE",
    x: 521.1,
    y: 131.6,
    tier: "Carrier Neutral Tier IV",
    activeTicketTitle: "TM-2026-00038: 24x Dense Blade Server Commissioning",
    engineer: "Lukas Weber",
    engineerStatus: "en_route",
    eta: "18 mins (Transit)",
  },
  {
    id: "site-lon-01",
    name: "Telehouse North Two",
    city: "London",
    country: "United Kingdom",
    code: "GB",
    x: 499.7,
    y: 127.3,
    tier: "London Interconnect",
    activeTicketTitle: "TM-2026-00035: Out-of-band PDU Remediation",
    engineer: "Marcus Davies",
    engineerStatus: "on_site",
    eta: "On Site (Suite 4)",
  },
  {
    id: "site-ams-01",
    name: "Digital Realty AMS1",
    city: "Amsterdam",
    country: "Netherlands",
    code: "NL",
    x: 511.8,
    y: 124.6,
    tier: "Equinix Science Park",
    activeTicketTitle: "TM-2026-00044: Spine-Leaf Cabling SAN Deployment",
    engineer: "Dirk van Dijk",
    engineerStatus: "en_route",
    eta: "35 mins (Transit)",
  },
  {
    id: "site-mad-01",
    name: "Interxion MAD2",
    city: "Madrid",
    country: "Spain",
    code: "ES",
    x: 490.5,
    y: 162.3,
    tier: "Silicon Alley Madrid",
    engineer: "Carlos Mendez",
    engineerStatus: "available",
    eta: "Ready for Dispatch (15m mobilization)",
  },
  {
    id: "site-war-01",
    name: "Equinix WA1",
    city: "Warsaw",
    country: "Poland",
    code: "PL",
    x: 550.5,
    y: 125.0,
    tier: "CEE Regional Gateway",
    engineer: "Piotr Nowak",
    engineerStatus: "standby",
    eta: "On Standby",
  },
];

const STATUS_CONFIG = {
  on_site: {
    label: "On Site",
    color: "#FFB84D",
    bg: "rgba(255, 184, 77, 0.12)",
    border: "rgba(255, 184, 77, 0.35)",
  },
  en_route: {
    label: "En Route",
    color: "#38E1FF",
    bg: "rgba(56, 225, 255, 0.12)",
    border: "rgba(56, 225, 255, 0.35)",
  },
  available: {
    label: "Available",
    color: "#3DDC97",
    bg: "rgba(61, 220, 151, 0.12)",
    border: "rgba(61, 220, 151, 0.35)",
  },
  standby: {
    label: "Standby",
    color: "#8B97AB",
    bg: "rgba(139, 151, 171, 0.12)",
    border: "rgba(139, 151, 171, 0.35)",
  },
};

function arc(from: { x: number; y: number }, to: { x: number; y: number }, lift = 0.22) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const mx = (from.x + to.x) / 2 - dy * lift;
  const my = (from.y + to.y) / 2 + dx * lift * 0.35 - Math.abs(dx) * 0.06;
  return `M${from.x},${from.y} Q${mx},${my} ${to.x},${to.y}`;
}

export function LiveMapView() {
  const [selectedSite, setSelectedSite] = useState<MapSite | null>(DEFAULT_MAP_SITES[0]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showConsentModal, setShowConsentModal] = useState(false);

  const filteredSites = useMemo(() => {
    if (statusFilter === "all") return DEFAULT_MAP_SITES;
    return DEFAULT_MAP_SITES.filter((s) => s.engineerStatus === statusFilter);
  }, [statusFilter]);

  const activeJobsCount = DEFAULT_MAP_SITES.filter(
    (s) => s.engineerStatus === "on_site" || s.engineerStatus === "en_route"
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Telemetry & Controls */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mono-label flex items-center gap-2 text-[9px] text-[#38E1FF]">
            <Radio size={12} className="animate-pulse text-[#38E1FF]" />
            LIVE FIELD RADAR & GEOFENCE TELEMETRY
          </div>
          <h2 className="mt-1 text-[20px] font-light text-[#E8EEF9]">
            European data center operations map
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#0E1522] px-3 py-1.5 text-[11px]">
            <Filter size={12} className="text-[#6F7E94]" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-[11px] text-[#C5D0DF] outline-none"
            >
              <option value="all" className="bg-[#101724]">
                All statuses ({DEFAULT_MAP_SITES.length})
              </option>
              <option value="on_site" className="bg-[#101724]">
                On site
              </option>
              <option value="en_route" className="bg-[#101724]">
                En route
              </option>
              <option value="available" className="bg-[#101724]">
                Available
              </option>
            </select>
          </div>

          <button
            onClick={() => setShowConsentModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-[10px] text-[#8EA0B5] transition hover:border-[#38E1FF]/30 hover:text-[#38E1FF]"
          >
            <Shield size={12} className="text-[#3DDC97]" />
            GDPR Location Protocol
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-white/[0.07] bg-[#0B1018]/90 p-4">
          <div className="mono-label text-[8px] text-[#718096]">ACTIVE MISSIONS</div>
          <div className="mt-2 text-[24px] font-light text-[#38E1FF]">
            {activeJobsCount}
          </div>
          <div className="mt-1 text-[9px] text-[#8695AA]">Dispatched & on site</div>
        </div>
        <div className="rounded-2xl border border-white/[0.07] bg-[#0B1018]/90 p-4">
          <div className="mono-label text-[8px] text-[#718096]">FACILITIES MONITORED</div>
          <div className="mt-2 text-[24px] font-light text-[#E8EEF9]">
            {DEFAULT_MAP_SITES.length}
          </div>
          <div className="mt-1 text-[9px] text-[#8695AA]">Tier III/IV carrier neutral</div>
        </div>
        <div className="rounded-2xl border border-white/[0.07] bg-[#0B1018]/90 p-4">
          <div className="mono-label text-[8px] text-[#718096]">MEDIAN MOBILIZATION</div>
          <div className="mt-2 text-[24px] font-light text-[#3DDC97]">4.2h</div>
          <div className="mt-1 text-[9px] text-[#8695AA]">Across Western Europe</div>
        </div>
        <div className="rounded-2xl border border-white/[0.07] bg-[#0B1018]/90 p-4">
          <div className="mono-label text-[8px] text-[#718096]">GEOFENCE STATUS</div>
          <div className="mt-2 flex items-center gap-2 text-[14px] font-medium text-[#3DDC97]">
            <CheckCircle2 size={16} /> 150m Precision
          </div>
          <div className="mt-1 text-[9px] text-[#8695AA]">Automated check-in verified</div>
        </div>
      </div>

      {/* Main Map Visual Canvas + Details Drawer */}
      <div className="grid gap-6 lg:grid-cols-[1.8fr_1fr]">
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.09] bg-[#080D14] p-3 shadow-2xl sm:p-5">
          <div className="pointer-events-none absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full border border-white/[0.08] bg-[#0B1018]/90 px-3 py-1 text-[10px] text-[#AAB8CC] backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute h-full w-full animate-ping rounded-full bg-[#38E1FF] opacity-50" />
              <span className="relative h-2 w-2 rounded-full bg-[#38E1FF]" />
            </span>
            <span>Live Europe Operations Telemetry</span>
          </div>

          <svg
            viewBox={MAP_VIEWBOX}
            className="h-auto w-full select-none"
            role="group"
            aria-label="Live operations map of active sites and engineers"
          >
            <defs>
              <radialGradient id="hqPulse" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#38E1FF" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#38E1FF" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38E1FF" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#FFB84D" stopOpacity="0.4" />
              </linearGradient>
            </defs>

            {/* Base landmass */}
            <path d={LAND_PATH} fill="#141E2D" opacity="0.45" />

            {/* Covered countries */}
            {Object.entries(COUNTRY_PATHS).map(([code, d]) => (
              <path
                key={code}
                d={d}
                fill="#182436"
                fillOpacity={0.6}
                stroke="#2B3C55"
                strokeWidth={0.6}
                className="transition-colors hover:fill-[#20324B]"
              />
            ))}

            {/* Deployment vectors connecting Lisbon HQ to active mission sites */}
            {filteredSites.map((site) => {
              if (site.engineerStatus === "available" || site.engineerStatus === "standby")
                return null;
              return (
                <path
                  key={`arc-${site.id}`}
                  d={arc(HQ_POINT, site)}
                  fill="none"
                  stroke="url(#routeGrad)"
                  strokeWidth={1.4}
                  strokeDasharray="4 3"
                  className="animate-pulse"
                />
              );
            })}

            {/* Site & Engineer Markers */}
            {filteredSites.map((site) => {
              const isSelected = selectedSite?.id === site.id;
              const cfg = STATUS_CONFIG[site.engineerStatus];
              return (
                <g
                  key={site.id}
                  transform={`translate(${site.x}, ${site.y})`}
                  className="cursor-pointer"
                  onClick={() => setSelectedSite(site)}
                >
                  {/* Pulsing ring for active missions */}
                  {(site.engineerStatus === "on_site" || site.engineerStatus === "en_route") && (
                    <circle
                      r={isSelected ? 14 : 9}
                      fill="none"
                      stroke={cfg.color}
                      strokeWidth={1}
                      opacity={0.6}
                      className="animate-ping"
                    />
                  )}

                  <circle
                    r={isSelected ? 6 : 4}
                    fill={cfg.color}
                    stroke="#0B1018"
                    strokeWidth={1.5}
                    style={{
                      filter: isSelected
                        ? `drop-shadow(0 0 10px ${cfg.color})`
                        : undefined,
                    }}
                  />

                  {/* Marker label */}
                  <text
                    x={7}
                    y={3}
                    fill="#C6D3E4"
                    fontSize={7.5}
                    fontWeight={isSelected ? "bold" : "normal"}
                    fontFamily="monospace"
                  >
                    {site.city}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Selected Site / Mission Details Panel */}
        {selectedSite ? (
          <div className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#0B1018]/95 p-5 shadow-2xl">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <span className="mono-label text-[8px] text-[#38E1FF]">
                    SELECTED FACILITY · {selectedSite.code}
                  </span>
                  <h3 className="mt-1 text-[16px] font-medium text-[#E8EEF9]">
                    {selectedSite.name}
                  </h3>
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[#8696AB]">
                    <MapPin size={12} className="text-[#38E1FF]" />
                    {selectedSite.city}, {selectedSite.country}
                  </div>
                </div>

                <span
                  className="rounded-full px-2.5 py-1 text-[9px] font-medium"
                  style={{
                    color: STATUS_CONFIG[selectedSite.engineerStatus].color,
                    background: STATUS_CONFIG[selectedSite.engineerStatus].bg,
                    border: `1px solid ${STATUS_CONFIG[selectedSite.engineerStatus].border}`,
                  }}
                >
                  {STATUS_CONFIG[selectedSite.engineerStatus].label}
                </span>
              </div>

              {/* Technical Specifications */}
              <div className="mt-5 space-y-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-[11px]">
                <div className="flex items-center justify-between border-b border-white/[0.04] pb-2">
                  <span className="text-[#728298]">Facility Tier</span>
                  <span className="font-mono text-[#BAC6D7]">{selectedSite.tier || "Tier III"}</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/[0.04] pb-2">
                  <span className="text-[#728298]">Geofence Radius</span>
                  <span className="font-mono text-[#BAC6D7]">150 meters</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#728298]">Assigned Engineer</span>
                  <span className="flex items-center gap-1 font-medium text-[#E1EAF4]">
                    <User size={12} className="text-[#38E1FF]" />
                    {selectedSite.engineer || "Unassigned"}
                  </span>
                </div>
              </div>

              {/* Active Mission Details */}
              {selectedSite.activeTicketTitle ? (
                <div className="mt-4 rounded-xl border border-[#38E1FF]/20 bg-[#38E1FF]/[0.04] p-4">
                  <div className="mono-label flex items-center gap-1.5 text-[8px] text-[#38E1FF]">
                    <Activity size={11} /> ACTIVE OPERATIONAL DISPATCH
                  </div>
                  <div className="mt-2 text-[11px] font-medium text-[#DFE8F4]">
                    {selectedSite.activeTicketTitle}
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[10px] text-[#A3B2C6]">
                    <Clock size={12} className="text-[#38E1FF]" />
                    Status: <span className="text-white">{selectedSite.eta}</span>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.015] p-4 text-[10px] text-[#718096]">
                  No active tickets assigned to this facility right now. Standing by for dispatch.
                </div>
              )}
            </div>

            {/* Security & Access Instructions Note */}
            <div className="mt-5 border-t border-white/[0.06] pt-4 text-[9px] leading-relaxed text-[#5C6B80]">
              <span className="font-semibold text-[#8090A6]">Security Protocol:</span> Access badges and cage credentials are restricted to the verified engineer upon confirmed geofence check-in.
            </div>
          </div>
        ) : (
          <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-white/[0.07] bg-[#0B1018]/90 p-6 text-center text-[#74849A]">
            <Server size={24} className="mb-2 text-[#38E1FF]" />
            <p className="text-[12px] font-medium text-[#D0D9E6]">Select a facility</p>
            <p className="mt-1 text-[10px]">Click any site pin on the radar map to view engineer status.</p>
          </div>
        )}
      </div>

      {/* GDPR Consent Modal */}
      {showConsentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#0B1018] p-6 shadow-2xl">
            <div className="flex items-center gap-2.5 text-[#3DDC97]">
              <Shield size={20} />
              <h3 className="text-[15px] font-medium text-white">GDPR Location Privacy Protocol</h3>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-[#8B98AD]">
              TechMaths enforces strict data protection rules in compliance with EU GDPR:
            </p>
            <ul className="mt-3 space-y-2 text-[10px] text-[#A6B4C8]">
              <li className="flex items-start gap-2">
                <span className="text-[#38E1FF]">•</span>
                <span>Location telemetry is active <strong>only</strong> when an engineer has accepted a dispatch and toggled Online.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#38E1FF]">•</span>
                <span>No tracking occurs when the engineer is Offline or off-duty.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#38E1FF]">•</span>
                <span>Telemetry data is stored in the Supabase EU region (Frankfurt) and automatically purged after 30 days.</span>
              </li>
            </ul>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowConsentModal(false)}
                className="rounded-full bg-[#38E1FF] px-4 py-2 text-[10px] font-semibold text-[#04141A]"
              >
                Understood & Acknowledged
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
