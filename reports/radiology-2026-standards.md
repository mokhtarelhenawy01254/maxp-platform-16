# Radiology 2026 Standards & Market Research — Report for MaxP PACS/RIS

**Product context:** Multi-tenant SaaS PACS/RIS targeting mid-size radiology centers in Egypt/MENA. Backend Node.js + Prisma, frontend React + Cornerstone.js. Platform repository at `H:/maxp-platform`.

**Workspace scan note:** The current `H:/maxp-platform` repository does **not** yet contain DICOM/PACS/RIS code (no Orthanc, dcm4chee, OHIF, Cornerstone, DICOMweb, or HL7 FHIR dependencies found). This report therefore treats the system as a greenfield design exercise and marks the "in product today" column as **Not implemented** for every item, so the team has a clean build-vs-buy and build-priority reference.

**Reading legend used below:**
- **Table stakes 2026** = must-have for a competitive bid, will be scored in any MENA/Egypt RFP
- **Competitive advantage** = differentiates the bid but is not yet universal
- **Differentiator** = leading-edge; rare in the Egypt/MENA mid-tier
- ✅ = already in the product, ❌ = not implemented (greenfield)

---

## 1. DICOM Standards (2026)

### 1.1 DICOMweb (WADO-RS, QIDO-RS, STOW-RS, UPS-RS)

DICOMweb is now the **de-facto mandatory API surface** for any new PACS. DICOM PS3.18 (2025b/2026) defines four RESTful services:

| Service | Purpose | DIMSE equivalent |
|---|---|---|
| **QIDO-RS** | Query studies/series/instances by DICOM attributes; returns JSON or XML | C-FIND |
| **WADO-RS** | Retrieve instances, metadata, bulkdata, rendered (JPEG/PNG) | C-GET / C-MOVE |
| **STOW-RS** | Store instances to the archive | C-STORE |
| **UPS-RS** | Unified Procedure Step worklist (push/pull/notification) | MWL + MPPS over REST |

Mandatory query keys per QIDO-RS: `PatientID`, `StudyDate`, `Modality`, `AccessionNumber` (minimum required set). A PACS conformance statement must declare which resource levels (study/series/instance) and which DICOM attributes it accepts.

**Sources:**
- DICOM PS3.18 specification, current edition — https://dicom.nema.org/medical/dicom/current/output/chtml/part18/ps3.18.html
- DICOM Standard Committee, "DICOMweb" (Wikipedia compilation of the standard) — https://en.wikipedia.org/wiki/DICOMweb
- Medicai engineering deep-dive on DICOMweb (QIDO-RS, WADO-RS, STOW-RS, UPS-RS) — https://blog.medicai.io/en/what-is-dicomweb/
- DICOM CP-2584 ("The PACS shall be conformant to the DICOM WADO-RS, QIDO-RS, and STOW-RS Web Services") — https://www.dicomstandard.org/news-dir/current/docs/cpack136/cp2584.pdf
- Alvearie imaging-ingestion DICOMweb Ingestion Service (Kubernetes reference architecture) — https://github.com/Alvearie/imaging-ingestion/blob/main/docs/dicomweb-ingestion-service/overview.md

**Status in product:** ❌ Not implemented. **2026 stance:** **Table stakes.** A 2026 PACS without a full DICOMweb surface (all three core services + metadata resources) cannot be sold as "cloud-native." UPS-RS is still optional in most vendors but is the **competitive advantage** tier.

### 1.2 DICOM Structured Report (SR) and TID 1500

DICOM SR (PS3.16 templates — TID 1500 measurement report, TID 2000/chest CAD, etc.) is **table stakes for AI write-back, quantitative reporting, and downstream analytics**. A 2026 study by JICRCR showed AI models producing DICOM SR directly achieve "complete DICOM compliance and universal PACS compatibility" while preserving radiologist autonomy (J Int Clin Radiol Res, 2026).

**Sources:**
- JICRCR 2026 — "A Novel Framework For DICOM Structured Reporting Integration" — https://jicrcr.com/index.php/jicrcr/article/download/3494/2962/7498
- DICOM PS3.16 (Content Mapping Resource), 2025a — https://dicom.nema.org/medical/dicom/current/output/chtml/part16/chapter_A.html
- David Clunie, "DICOM Structured Reporting" reference book — http://www.dclunie.com/pixelmed/DICOMSR.book.pdf

**Status in product:** ❌ Not implemented. **2026 stance:** **Table stakes for AI**, **competitive advantage** for purely manual reporting workflows.

### 1.3 DICOM SEG (Segmentation)

Adoption is **growing but still incomplete**. DICOM SEG (multi-frame, binary or fractional, voxel-accurate) is the recommended format for AI-produced segmentations in radiology (a 2025 step-by-step radiologist guide published in *Insights into Imaging* recommends DICOM SEG for all clinical radiologic segmentations).

Vendor support is mixed: most PACS still default to RT Structure Set (RTSS) for legacy reasons, but new AI vendors default to SEG. IHE AIR (AI Results) and the AIW-I / AIR+ profiles reference SEG as the canonical pixel-result type.

**Sources:**
- Insights into Imaging 2025, "A step-by-step guide of segmentation for radiologists" — https://d-nb.info/1372247629/34
- Collective Minds, "DICOM Segmentation Explained" — https://collectiveminds.health/articles/dicom-segmentation-complete-guide-to-medical-image-analysis
- Oosterwijk (LinkedIn), "A deep dive into DICOM SEG output for imaging AI results" — https://www.linkedin.com/pulse/deep-dive-dicom-seg-output-imaging-ai-results-herman-oosterwijk-plmjc
- PMC, "A vendor-agnostic, PACS integrated, and DICOM-compatible segmentation workflow" — https://pmc.ncbi.nlm.nih.gov/articles/PMC10637622/
- J Imaging Inform Med 2026, "A Native Strategy for Integrating Deep-Learning Models for Segmentation into a Radiological Viewer" — https://pubmed.ncbi.nlm.nih.gov/41772359/

**Status in product:** ❌ Not implemented. **2026 stance:** **Competitive advantage** — full SEG read/write/display is rare; RTSS-only support is no longer acceptable for AI customers.

### 1.4 DICOM MPPS (Modality Performed Procedure Step)

MPPS (N-CREATE "IN PROGRESS" → N-SET "COMPLETE/DISCONTINUED") is **still relevant for legacy DIMSE modalities** but is being progressively replaced by **IHE AIW-I / UPS-RS push or trigger-pull workflows**. The VA/DoD 2026 DICOM Conformance Requirements still mandate Verification + MWL + Storage; MPPS is "optional and not mandated."

**Sources:**
- DICOM PS3.3, B.17 Modality Performed Procedure Step IOD — https://dicom.nema.org/medical/dicom/current/output/chtml/part03/sect_b.17.html
- SIIM Otpedia, "Modality Performed Procedure Step (MPPS)" — https://siim.org/otpedia/modality-performed-procedure-step-mpps-mpps/
- PMC PMC3046723, "Benefits of the DICOM Modality Performed Procedure Step" — https://pmc.ncbi.nlm.nih.gov/articles/PMC3046723/
- VA/DoD Joint DICOM Conformance Requirements for Imaging Modalities — https://www.va.gov/HEALTH/imaging/docs/JointVA_DoDDICOM.pdf

**Status in product:** ❌ Not implemented. **2026 stance:** **Table stakes for DIMSE compatibility**, **competitive advantage** if you can route MPPS → UPS-RS so modalities can stay DIMSE while the PACS becomes DICOMweb.

### 1.5 DICOM Radiation Dose Structured Report (RDSR)

RDSR (TID 10011 for CT; XA Projection X-Ray, Mammography, Radiography, Radiofluoroscopy, Dentistry — see DICOM Supplement 245, January 2026) is **mandatory for any site with CT, interventional fluoro, or mammography**. The Patient RDSR (P-RDSR) supplement, in public comment, will allow true patient-specific dose estimates.

**Sources:**
- DICOM Standard, "Radiation Dose Recording" — https://www.dicomstandard.org/using/radiation/
- DICOM Supplement 245, "RDSR Informative Annex" (Public Comment Jan 14, 2026) — https://www.dicomstandard.org/News-dir/ftsup/docs/sups/sup245.pdf
- DICOM Supplement 245 slides — https://www.dicomstandard.org/news-dir/current/docs/sups/sup245-slides.pdf
- Radiology Today, "Imaging Informatics: DICOM Dose Tracking" — https://www.radiologytoday.net/imaging-informatics-dicom-dose-tracking/
- DiagnosticRadPhys, "CT Dose Index Monitoring: RDSR, DRLs, and the ACR DIR" — https://www.diagnosticradphys.com/physicspulse/diagnostic-medical-physics/ct-radiation-dose-index-monitoring/
- DICOM P-RDSR supplement — https://www.dicomstandard.org/news/supplements/view/patient-radiation-dose-structured-report-(p-rdsr)
- DICOM PS3.16 2025a, CT Radiation Dose SR IOD Templates — https://dicom.nema.org/medical/dicom/current/output/chtml/part16/sect_ctradiationdosesriodtemplates.html

**Status in product:** ❌ Not implemented. **2026 stance:** **Table stakes** for CT/fluoro/mammo; P-RDSR is a **differentiator**.

### 1.6 DICOM Modality Worklist (MWL)

MWL (C-FIND against a Scheduled Procedure Step provider, normally the RIS) is **mandatory for any modality that doesn't speak HL7/FHIR natively**. The VA/DoD 2026 mandate keeps Verification + MWL + Storage as required; Storage Commitment and MPPS are optional.

**Sources:**
- DICOM PS3.4 K.6 SOP Class Definitions (MWL) — https://dicom.nema.org/medical/dicom/current/output/chtml/part04/sect_k.6.html
- PACS Boot Camp, "DICOM Modality Worklist" — https://pacsbootcamp.com/dicom-modality-worklist/
- DICOMObjects KB, "Modality Worklist" — https://www.dicomobjects.com/kb/Modality-Worklist/
- VA/DoD Joint DICOM Conformance Requirements — https://www.va.gov/HEALTH/imaging/docs/JointVA_DoDDICOM.pdf

**Status in product:** ❌ Not implemented. **2026 stance:** **Table stakes** — DICOMweb-native UPS-RS is gradually replacing MWL but modalities are 5-10 years from retiring MWL.

### 1.7 DICOM Presentation State and Hanging Protocols

Presentation State (Grayscale Softcopy PS, Color PS, Pseudo-Color PS, Blending PS) and Hanging Protocol objects are **table stakes for enterprise multi-monitor reading rooms**. They define how a study is laid out, windowed, and annotated — and allow a reading layout to follow the user across workstations.

**Sources:**
- DICOM PS3.4, "U Hanging Protocol Query/Retrieve Service Class" — https://dicom.nema.org/medical/dicom/current/output/chtml/part04/chapter_u.html
- DICOM PS3.17, "V Hanging Protocols (Informative)" — https://dicom.nema.org/medical/dicom/current/output/chtml/part17/chapter_V.html
- DICOM Supplement 60 final text, Hanging Protocols — https://dicom.nema.org/medical/dicom/Final/sup60_ft.pdf
- David Clunie, "Color Presentation States Hanging Protocols" — https://www.dclunie.com/papers/SPIE_20050111_WG11.pdf

**Status in product:** ❌ Not implemented. **2026 stance:** **Table stakes** for any multi-radiologist center; Cornerstone3D supports Hanging Protocols out of the box.

### 1.8 IHE Profiles relevant for 2026

The IHE Radiology Technical Framework (Vol 1x + Vol 2, published 2025-08-08) lists the current set:

| Profile | Purpose | 2026 priority |
|---|---|---|
| **SWF.b** (Scheduled Workflow.b) | Order → schedule → acquire → store → view | **Table stakes** |
| **RWF** (Reporting Workflow) | Dictation / transcription / verification / sign-off | **Table stakes** |
| **PIR** (Patient Information Reconciliation) | Trauma / mis-ID handling | **Table stakes** |
| **EBIW** (Encounter-Based Imaging Workflow) | Encounter-linked imaging outside radiology | **Table stakes** |
| **PWF / PAWF** (Post-Processing/Acquisition Workflow) | CAD, MPR, 3D, AI post-processing worklist | **Competitive advantage** |
| **ED** (Evidence Documents) | SR / SEG / KO storage | **Table stakes** |
| **ARI** (Access to Radiology Information) | In-network image/report sharing | **Table stakes** |
| **ATNA** (Audit Trail & Node Authentication) | Required for HIPAA / PDPL | **Table stakes** |
| **XDS-I.b** (Cross-Enterprise Document Sharing for Imaging.b) | Cross-enterprise image sharing | **Competitive advantage** in MENA |
| **XCA-I** (Cross-Community Access for Imaging) | Cross-community image sharing | **Differentiator** |
| **IRRWF / IDEP** (Import Reconciliation / Import & Display of External Priors) | CD import, external priors | **Table stakes** |
| **IOCM** (Imaging Object Change Management) | Replace / delete propagation | **Table stakes** |
| **REM** (Radiation Exposure Monitoring) | Aggregate RDSR for dose registries | **Table stakes** (CT) |
| **AIR / AIR+** (AI Results) | AI result exchange (no Secondary Capture) | **Competitive advantage** |
| **AIW-I** (AI Workflow for Imaging) | UPS-RS-based AI orchestration | **Competitive advantage** |
| **AIRA** (AI Result Assessment) | Result feedback loop, public comment 2025-06-12 | **Differentiator** |
| **IDR** (Imaging Diagnostic Report) | New profile under public comment Mar 8 – Apr 9 2026 | **Differentiator** |
| **MAWF** (Mammography Acquisition Workflow) | Mammo-specific workflow exceptions | **Table stakes for mammo sites** |
| **WIA / WIC** (Web-based Image Access / Capture) | DICOMweb enterprise access | **Table stakes** |
| **MHD-I** (Mobile access to Health Documents for Imaging) | Mobile image viewing | **Competitive advantage** |
| **CHG** (Charge Posting) | Procedure → billing | **Table stakes** |
| **KIN** (Key Image Note) | Bookmarking | **Competitive advantage** |

**Sources:**
- IHE Radiology Domain (RAD) TF-1 2025-08-08 — https://profiles.ihe.net/RAD/index.html
- IHE Wiki, "Profiles" — https://wiki.ihe.net/index.php/Profiles
- IHE Radiology TF-1 (PDF) — https://www.ihe.net/uploadedFiles/Documents/Radiology/IHE_RAD_TF_Vol1.pdf
- IHE AI Results (AIR) Trial Implementation rev 1.3, 2025-08-08 — https://www.ihe.net/uploadedFiles/Documents/Radiology/IHE_RAD_Suppl_AIR.pdf
- IHE AI Workflow for Imaging (AIW-I) — https://www.ihe.net/uploadedFiles/Documents/Radiology/IHE_RAD_Suppl_AIW-I.pdf
- IHE AI Profiles for Radiology, IHE Europe EXP DAYS 2026 — https://connectathon.ihe-europe.net/sites/ihe-cat2014.org/files/IHE_EU_EXP_DAYS_2026_Marc_Kammerer_IHE_AI_Profile_RAD.pdf
- IHE Deutschland Radiology domain — https://www.ihe-d.de/domains-profile/radiology

**Status in product:** ❌ None implemented. **2026 stance:** A MENA customer RFP that lists "IHE SWF.b + EBIW + REM + ARI" is normal; AIW-I + AIR is the differentiator that wins the AI-aware bids.

---

## 2. HL7 / FHIR (2026)

### 2.1 R4 vs R5 — adoption status

- **FHIR R4 (4.0.1)** — the de-facto production default. All US Core, JP Core, KR Core, CH Core, AU Core, VN Core anchor on R4.
- **FHIR R4B (4.3.0)** — minor upgrade, useful when you need `SubscriptionTopic` semantics.
- **FHIR R5 (5.0.0)** — STU since March 2023; **R6 is in first full ballot through 2026**. R5 adds `SubscriptionTopic`, `ImagingSelection`, `Permission`, `RegulatedAuthorization` (~157 resources total, vs. R4's 146).
- R5's `DiagnosticReport.imagingStudy` is renamed to `study` (breaking change).

**Sources:**
- HL7 Vietnam FHIR versions guide, 2026 — https://hl7.org.vn/en/knowledge/fhir-versions/
- FHIR R4 DiagnosticReport (current) — https://hl7.org/fhir/R4/diagnosticreport.html
- FHIR ImagingStudy R6 ballot (build.fhir.org) — https://build.fhir.org/imagingstudy.html
- HL7 Europe Imaging Report IG (R4 ballot 2026-03-16, R5 ballot 2025-05-14) — https://euridice.org/specifications-imaging-report-fhir-ig/

**Status in product:** ❌ Not implemented. **2026 stance:** **Table stakes** to support FHIR R4 endpoints (`/metadata`, `/Patient`, `/ImagingStudy`, `/ServiceRequest`, `/DiagnosticReport`, `/AuditEvent`); **competitive advantage** to also implement R5 `ImagingSelection` and `Subscription`/`SubscriptionTopic` for real-time worklist sync.

### 2.2 ImagingStudy resource — required fields

R6 added `ImagingStudy.series.bodySite` cardinality `0..*`, `ImagingStudy.series.instances.numberOfFrames`, and clarified how to construct DICOMweb requests from `Endpoint` and `ImagingStudy.endpoint`. The urn:dicom:uid identifier system is mandatory. DICOMweb request construction rules are now normative.

**Sources:**
- FHIR ImagingStudy R6.0.0-ballot4 — https://build.fhir.org/imagingstudy.html
- EU Imaging Report IG (R4 + R5) — https://euridice.org/specifications-imaging-report-fhir-ig/

**Status in product:** ❌ Not implemented. **2026 stance:** **Table stakes** for R4 ImagingStudy; **differentiator** for full R5/R6 ImagingSelection + ImagingMedia.

### 2.3 ImagingSelection, ImagingMedia — newer resources

- **ImagingSelection** (R5+) — references a subset of a DICOM study (frame / region / series) without re-loading the whole object. Essential for teleradiology and AI "point me at the relevant slice" use cases.
- **ImagingMedia** (R5+) — references photo / video / non-DICOM clinical media.

**Sources:**
- HL7 Vietnam FHIR versions guide — https://hl7.org.vn/en/knowledge/fhir-versions/
- HL7 EU Imaging Report IG — https://euridice.org/specifications-imaging-report-fhir-ig/

**Status in product:** ❌ Not implemented. **2026 stance:** **Differentiator** for 2026-27 MENA deployments; becomes **table stakes by 2027-28**.

### 2.4 ServiceRequest for orders

FHIR `ServiceRequest` is the modern equivalent of HL7 v2 ORM/OMG. Order placer → order filler, with `Order.svc` codes mapped to local and CPT/Egyptian procedure code sets. Should support `basedOn`, `replaces`, `occurrence`, `performer`, `note` for clinical context.

**Status in product:** ❌ Not implemented. **2026 stance:** **Table stakes** as the modern order interface; HL7 v2 ORM is still acceptable but FHIR is preferred by the Egypt UHIA digital strategy (see Section 8).

### 2.5 DiagnosticReport for results

R4 places imaging study references in `DiagnosticReport.imagingStudy`; R5 renames this to `DiagnosticReport.study` and adds `supportingInfo`. R6 formalizes additional ImagingStudy references in supportingInfo. Per FHIRcast, the accession number SHALL be provided as a business identifier, and the `basedOn` reference to `ServiceRequest` is the recommended pattern.

**Sources:**
- FHIR R4 DiagnosticReport — https://hl7.org/fhir/R4/diagnosticreport.html
- FHIRcast v3.0.0 Artifacts Summary — https://fhircast.hl7.org/artifacts.html
- HL7 EU Imaging Report IG — https://euridice.org/specifications-imaging-report-fhir-ig/

**Status in product:** ❌ Not implemented. **2026 stance:** **Table stakes**.

### 2.6 Subscription (FHIRcast) for live worklist sync

FHIRcast STU3 (based on FHIR R4) is the dominant standard for synchronizing application context across the workstation. When the radiologist opens a study in the viewer, EHR, reporting tool, and AI sidekick all switch to the same patient/study/ImagingSelection via pub/sub.

**Sources:**
- FHIRcast v3.0.0 Artifacts Summary — https://fhircast.hl7.org/artifacts.html

**Status in product:** ❌ Not implemented. **2026 stance:** **Competitive advantage** — Sectra, Visage, Epic-integrated suites all support FHIRcast; this is the standard way to do "radiologist opens study in EHR, viewer pops open, AI fires in background."

### 2.7 SMART on FHIR for third-party apps

SMART App Launch + OAuth 2.0 + OpenID Connect allows third-party apps to be launched from the EHR (Epic, Cerner, Athena, and in MENA — the Egypt UHIA digital front door) with patient context, scoped access, and a refresh-token model. **Required** for any portal that wants to be embedded in the EHR.

**Status in product:** ❌ Not implemented. **2026 stance:** **Table stakes** for any portal/launchpad story; especially relevant in Egypt where UHIA is consolidating digital health records across 12 million+ beneficiaries.

---

## 3. Interoperability & Cloud (2026)

### 3.1 Cloud-native PACS architecture

Three hyperscalers now offer managed DICOM services that are HIPAA-eligible and the de-facto reference architecture for greenfield PACS:

| Provider | Service | Notes |
|---|---|---|
| **AWS HealthImaging** | Petabyte-scale DICOM store, sub-second frame access, HTJ2K transcoding, EventBridge hooks, DICOMweb QIDO/WADO/STOW (since mid-2025 with BulkData), since March 2026 study-level fine-grained access control (multi-tenant friendly) | US East: $0.105/GB-month Frequent Access, $0.006/GB-month Archive Instant Access, ~$0.005 per 1k API calls. Imports free. |
| **Azure DICOM Service** | Part of Azure Health Data Services, paired with FHIR Service and MedTech Service; native DICOMweb | Paired with Azure API for FHIR (R4) and MedTech IoT |
| **GCP Cloud Healthcare API** | DICOM Store + FHIR Store + HL7v2 Store | All three in one API |

**Sources:**
- AWS HealthImaging product page — https://aws.amazon.com/healthimaging/
- AWS HealthImaging launch announcement — https://aws.amazon.com/blogs/industries/introducing-aws-healthimaging/
- AWS HealthImaging developer guide (DICOMweb) — https://docs.aws.amazon.com/healthimaging/latest/devguide/using-dicomweb.html
- Lushbinary, "AWS HealthImaging Guide: DICOM Storage, Pricing & AI" (June 2026) — https://lushbinary.com/blog/aws-healthimaging-healthcare-medical-imaging-cloud-guide/
- "Which Cloud for HIPAA? AWS vs Azure vs GCP (2026)" — https://www.ofashandfire.com/blog/hipaa-compliant-cloud-architecture-aws-azure-gcp
- Woltrio, "DICOM & PACS Development Guide 2026" — https://www.woltrio.com/en-us/health-tech/dicom-pacs-development

**Architecture pattern (4 layers):** ingestion (DICOMweb STOW-RS or DICOM C-STORE via Marketplace SCP) → storage (HealthImaging/DICOM Store) → access (DICOMweb + native API + EventBridge) → workflow (viewer + worklist broker + AI).

**Status in product:** ❌ Not implemented. **2026 stance:** **Table stakes for new MENA builds.** No new mid-size radiology center in 2026 should buy on-prem PACS hardware unless they have a hard data-residency constraint.

### 3.2 Vendor Neutral Archive (VNA) — required?

The VNA & PACS market is **$4.92B in 2026 → $6.94B by 2031** (Mordor Intelligence, 7.12% CAGR). Cloud segment is the fastest growing at 11.02% CAGR. PACS still 63.4% of revenue. The 2026 Best in KLAS VNA winner is **AGFA HealthCare Enterprise Imaging VNA** for the second year running, 89.8% customer satisfaction.

A true VNA supports: DICOM, DICOMweb, IHE XDS/XDS-I, HL7, FHIR; non-DICOM (PDF, photos, video, pathology); tag morphing + IOCM; ILM tiering; multi-tenant; documented DR (RPO/RTO); data portability.

**Sources:**
- Mordor Intelligence, "Vendor-Neutral Archive and PACS Market Size & Share Analysis" — https://www.mordorintelligence.com/industry-reports/global-vendor-neutral-archive-vna-and-pacs-market-industry
- Medicai, "Best Vendor-Neutral Archives in 2026: 9 VNA Platforms Compared" — https://blog.medicai.io/en/best-vendor-neutral-archives/
- Medicai, "Vendor Neutral Archive (VNA): Full Guide for 2026" — https://blog.medicai.io/en/vendor-neutral-archive/
- Evorad, "What Is a VNA (Vendor Neutral Archive)? 2026 Guide" — https://www.evorad.com/vendor-neutral-archive/
- Philips, "Vendor Neutral Archive (VNA) vs. PACS" — https://www.usa.philips.com/healthcare/article/vendor-neutral-archive-vna-the-foundation-for-enterprise-imaging

**Status in product:** ❌ Not implemented. **2026 stance:** **Competitive advantage** in mid-size MENA — most regional buyers still treat PACS and VNA as a single decision, so designing the system to be VNA-grade (standards-compliant, tag-morphing, ILM, portable) is a real differentiator even when not marketed as "VNA."

### 3.3 Edge caching, streaming WADO

For teleradiology and multi-site reads, HTTP/2 + HTTP/3, CloudFront/Azure CDN in front of WADO-RS, JPEG-based thumbnail streams, and HTJ2K lossless transcoding are now standard. AWS HealthImaging's "Archive Instant Access" tier delivers millisecond latency from cold storage without retrieval fees.

**Status in product:** ❌ Not implemented. **2026 stance:** **Competitive advantage** — local Egyptian PACS still mostly on-prem; CDN-fronted cloud PACS is rare in the country and is a selling point.

### 3.4 HIPAA Security Rule 2026 update (NPRM)

The HHS OCR NPRM (Federal Register 2024-30983, published **January 6, 2025**) is the first Security Rule overhaul since 2013. Key proposed changes (compliance deadline was tentatively **May 2026** but as of June 2026 the rule remains in limbo after the Jan 20, 2025 executive order froze agency rulemaking; nonetheless, it's a roadmap for global best practice):

- **Encryption of all ePHI at rest and in transit** is mandatory (kills the "addressable" exception). AES-256 named as standard at rest, TLS 1.2+ in transit.
- **Multi-factor authentication** for every workforce member accessing ePHI (driven by the Change Healthcare breach that exposed 192.7M records).
- **Technology asset inventory + network map**, reviewed at least every 12 months and after operational changes.
- **Vulnerability scanning every 6 months**, **penetration testing every 12 months**.
- **Backup RPO ≤ 48 hours, RTO ≤ 72 hours**, monthly restoration tests, backups at least every 6 months.
- **Network segmentation** between ePHI systems and general-use devices.
- **Anti-malware on all technology assets**, removal of extraneous software, port disabling per risk analysis.
- **Real-time monitoring + audit logs** for all activity on relevant systems.
- **Elimination of the "required vs addressable" distinction** — everything becomes required.
- **72-hour breach notification to HHS** (vs. 60 days today).
- **60-day effective date + 180-day compliance** after final publication = **240 days total**.

**Sources:**
- NorthPrivacyAdvisors, "The HIPAA Security Rule Overhaul: Where Things Stand in Mid-2026" — https://northprivacyadvisors.com/hipaa/the-hipaa-security-rule-overhaul-is-still-comingheres-where-it-stands
- Patient Protect, "HIPAA Regulatory Updates Tracker (2026)" — https://patient-protect.com/regulatory-updates
- Alston & Bird, "New Year, New HIPAA Security Rule" (Jan 2025) — https://www.alston.com/en/insights/publications/2025/01/new-year-new-hipaa-security-rule
- Federal Register, Vol 90 No 3, Jan 6 2025 — https://www.govinfo.gov/content/pkg/FR-2025-01-06/pdf/2024-30983.pdf
- BASG, "HIPAA Encryption Requirements 2026: Addressable Is Dead" — https://basgcorp.com/blog/hipaa-encryption-requirements-2026-addressable-dead/

**Status in product:** ❌ Not implemented (greenfield). **2026 stance:** **Table stakes globally** — even if Egypt doesn't mandate HIPAA, the Egypt PDPL (Section 8) is heading the same direction with mandatory 72-hour breach notification, DPO registration, and licensing.

---

## 4. AI / Clinical Decision Support (2026)

### 4.1 FDA-cleared AI in radiology — top 10 vendors

As of Q1 2026, **1,524 entries** on the FDA's AI/ML-enabled medical devices list; **76% (55 of 72 in Q2 2025) are radiology**. The dominant commercial AI vendors in radiology (in order of clearance count and deployment scale):

| Vendor | Use cases | 2026 footprint |
|---|---|---|
| **Aidoc** (Israel) | CT triage (PE, ICH, C-spine fracture, aortic dissection, appendicitis, bowel obstruction, spleen injury…) — **31+ FDA clearances**, **~2,000 hospitals, 60M cases/year**; **Jan 2026 foundation model** covers 14 CT conditions, 97% sensitivity / 98% specificity | $150M Series E; Nvidia / General Catalyst backed |
| **Viz.ai** (US) | LVO stroke (CT angio), PE, ICH, subdural, cardiology suite — **50+ clearances**, 1,700+ hospitals, $1.2B valuation | -39 min door-to-needle, -40% 90-day disability |
| **RapidAI** (US) | Stroke penumbra / CTA / perfusion; LVO competitor; 2,000+ hospitals | Stanford origin |
| **Annalise.ai** (Australia) | 124-finding CXR triage, head CT; US FDA cleared | NHS UK / Royal Australian adoption |
| **HeartFlow** (US) | Non-invasive FFR-CT (CPT 75577, reimbursable since Jan 2026) | De Novo + CE-IVDR |
| **Cleerly** (US) | Coronary CT-Angio plaque analysis | $381M raised, Mayo/Cleveland |
| **PathAI** (US) | Digital pathology (AISight Dx, Jun 2025); first AI pathology tool with FDA DDT qualification | Roche / BMS partnership |
| **Rad AI** (US) | Report drafting / impression generation / follow-up tracking — **workflow AI, not diagnostic**; ~50% of US imaging practices; $525M valuation | Sits alongside PowerScribe / MModal |
| **Lunit** (Korea) | CXR, mammo (INSIGHT DBT v1.2 cleared Mar 2026), 10K hospitals, KOSDAQ listed, $4B mkt cap | GE HealthCare partnership |
| **Qure.ai** (India) | CXR AI (WHO adopted), head CT, tuberculosis | Used in Indian national TB program |

**Sources:**
- FDA, "Artificial Intelligence-Enabled Medical Devices" list — https://www.fda.gov/medical-devices/software-medical-device-samd/artificial-intelligence-enabled-medical-devices
- FDA, March 2026 AI-Enabled Medical Devices list (CSV) — https://www.fda.gov/media/178541/download
- Pinggy, "AI Medical Imaging in 2026" — https://pinggy.io/blog/ai_medical_imaging_diagnostics_2026/
- MedAI Verdict, "Best AI radiology and imaging 2026" — https://medaiverdict.com/best-ai-radiology
- IntuitionLabs, "FDA-Approved AI Medical Devices List: Complete 2026 Guide" — https://intuitionlabs.ai/articles/fda-approved-ai-medical-devices-list
- AI-Pedias, "AI Medical Imaging & Radiology 2026: Aidoc vs Viz.ai vs PathAI" — https://en.ai-pedias.com/blog/ai-medical-imaging-radiology-2026
- pdpspectra, "AI Radiology 2026: Vendors, FDA, PACS" — https://pdpspectra.com/blog/ai-radiology-medical-imaging-2026/

**Status in product:** ❌ Not implemented. **2026 stance:** **Table stakes for any mid-size MENA center that wants to win referral volume** — the EHA/BCG AI MOU (Aug 2025) and the 500M-radiology-image UHIA database signal that AI is on the national agenda.

### 4.2 AI workflow integration patterns

Three maturity levels, in increasing order of interoperability:

1. **DICOM Secondary Capture** — AI burns bounding boxes into a new image series, stores as another series in the same study. Universal PACS support. No interaction, no machine-readable findings. RSNA/IHE explicitly discourage this for new builds.
2. **DICOM SR (TID 1500) + Grayscale Softcopy Presentation State (GSPS) or DICOM SEG** — coded, machine-readable findings; SR can autopopulate report templates; SEG allows the radiologist to scroll/move the mask.
3. **HL7 ORU + FHIR Observation/DiagnosticReport** — findings delivered to the RIS/HIS as structured observations; allows worklist prioritization and direct pre-fill into report templates.

The IHE **AIW-I** (AI Workflow for Imaging) profile uses **DICOM UPS-RS** to coordinate: Task Requester → Workflow Manager → Task Performer → Watcher. **AIR** (AI Results) standardizes the storage/retrieve/display of AI results (and explicitly excludes Secondary Capture). **AIRA** (AI Result Assessment) covers the radiologist-feedback loop.

**Sources:**
- IHE Radiology TF-1 (current) — https://profiles.ihe.net/RAD/index.html
- IHE AI Results (AIR) Trial Implementation rev 1.3 — https://www.ihe.net/uploadedFiles/Documents/Radiology/IHE_RAD_Suppl_AIR.pdf
- IHE AIW-I — https://www.ihe.net/uploadedFiles/Documents/Radiology/IHE_RAD_Suppl_AIW-I.pdf
- PMC PMC11208735, "Integrating and Adopting AI in the Radiology Workflow" — https://pmc.ncbi.nlm.nih.gov/articles/PMC11208735/
- PMC PMC12572421, "Automated Integration of AI Results into Radiology Reports Using IHE AIW-I, AIR, DICOM-SR and FHIR CDEs" — https://pmc.ncbi.nlm.nih.gov/articles/PMC12572421/
- IHE EU EXP DAYS 2026 slides — https://connectathon.ihe-europe.net/sites/ihe-cat2014.org/files/IHE_EU_EXP_DAYS_2026_Marc_Kammerer_IHE_AI_Profile_RAD.pdf
- SoftX, "Radiology AI Integration Guide: PACS, RIS & DICOM" — https://www.softx.ca/resources/radiology-ai-integration-pacs-ris-dicom
- AZMed, "How an X-ray moves through a radiology AI tool" — https://www.azmed.co/news-post/how-an-x-ray-moves-through-a-radiology-ai-tool

**Status in product:** ❌ Not implemented. **2026 stance:** **Table stakes** to accept DICOM SR / SEG / GSPS write-back; **competitive advantage** to speak AIW-I / UPS-RS for orchestrated AI routing; **differentiator** to do AI result assessment (AIRA) loop for model monitoring.

### 4.3 Auto-triage, critical findings, AI-drafted reports

- **Auto-triage** (Aidoc, Viz.ai, RapidAI, Annalise) — pre-read prioritization, often surfaces in the worklist as a flag or moves the study to the top of the queue. Mandatory for stroke, PE, ICH, aortic dissection pathways.
- **Critical-finding AI** — natural-language-processing of the radiologist's dictation to detect "critical" or specific pathology terms and trigger the critical-results workflow.
- **AI-drafted reports** (Rad AI, Nuance PowerScribe One AI) — auto-populate the impression, follow-up recommendations, and patient-friendly summaries. Adopted in ~50% of US practices (Rad AI share).

**Sources:**
- Nuance white paper, "PowerScribe One: Crossing the Great Divide" — https://www.nuance.com/content/dam/nuance/en_us/collateral/healthcare/white-paper/wp-powerscribe-one-crossing-the-great-divide-en-us.pdf
- Applied Radiology, "Nuance Leads the Way in AI-Powered Solutions" — https://appliedradiology.com/articles/nuance-leads-the-way-in-ai-powered-solutions
- Pinggy 2026 AI list — https://pinggy.io/blog/ai_medical_imaging_diagnostics_2026/
- Vizient, "Closing the loop on actionable radiology findings" — https://vizientinc-delivery.sitecorecontenthub.cloud/api/public/content/f5f2113f76fc45198342f61d4f91dc99

**Status in product:** ❌ Not implemented. **2026 stance:** **Competitive advantage** in MENA; **table stakes** in any center competing for stroke-ready / oncology-ready referral contracts.

### 4.4 AI governance / model monitoring

The 2026 procurement standard requires: prospective silent validation on local data, frozen acceptance criteria, monitoring dashboard (eligible/processed/failed, latency, concordance, overrides, scanner/protocol/site breakdowns), incident response, version rollback, and a documented model card with intended use. RSNA's "Imaging AI in Practice" demonstration is the canonical reference architecture.

**Sources:**
- SoftX AI integration guide (RFP checklist) — https://www.softx.ca/resources/radiology-ai-integration-pacs-ris-dicom
- IHE EU EXP DAYS 2026 AI Profiles — https://connectathon.ihe-europe.net/sites/ihe-cat2014.org/files/IHE_EU_EXP_DAYS_2026_Marc_Kammerer_IHE_AI_Profile_RAD.pdf

**Status in product:** ❌ Not implemented. **2026 stance:** **Differentiator** — most PACS vendors do not have this; building it well is a durable moat.

---

## 5. Critical Findings (2026)

### 5.1 ACR guidance

The ACR Actionable Reporting Workgroup defines a tiered list:
- **Category 1** (red): findings that could lead to death/significant morbidity if not addressed (e.g., intracranial hemorrhage, testicular torsion) — **direct verbal communication within minutes**.
- **Category 2** (orange): clinically significant, explain acute presentation, require specific treatment (e.g., pneumonia) — **non-direct communication may be sufficient within hours**.
- **Category 3** (yellow / "incidental"): no immediate action but significant long term (e.g., probable malignancy) — **within days**, ensure results are received and recognized.

**Sources:**
- ProAssurance Risk Management, "Develop a Process for Communicating Results Based on Criticality" — https://riskmanagement.proassurance.com/article-library/develop-a-process-for-communicating-results-based-on-criticality-to-improve-clinical-decision-making
- MACO Coalition, "Communicating Critical Test Results" — http://www.macoalition.org/Initiatives/docs/CTRsafePractices.pdf
- AJNR 2014 (mean CF→notification = 8.8 min, 72.5% within 10 min, 93.4% within 15 min) — https://www.ajnr.org/content/ajnr/early/2014/04/10/ajnr.A3918.full.pdf
- CAP Q-Probes study of 121 institutions (Arch Pathol Lab Med) — https://meridian.allenpress.com/aplm/article/132/12/1862/63752/Notification-of-Critical-Results-A-College-of
- Vizient PSO, "Closing the loop on actionable radiology findings" — https://vizientinc-delivery.sitecorecontenthub.cloud/api/public/content/f5f2113f76fc45198342f61d4f91dc99

### 5.2 Joint Commission / CMS requirements

The **Joint Commission NPSG.02.03.01** ("Report critical results of tests and diagnostic procedures on a timely basis") requires:
- EP 1: Written procedures defining critical results, by whom and to whom reported, acceptable length of time between availability and receipt.
- EP 3: Evaluate the timeliness of reporting.

**Effective January 1, 2026, the Joint Commission introduced National Performance Goals (NPGs)** replacing the prior NPSG chapter, but the critical-results requirement persists as a National Performance Goal. The TJC explicitly does not dictate a single time threshold — facilities define their own. CMS CoPs require a similar approach for hospital-based practices.

**Sources:**
- Joint Commission, "National Patient Safety Goals® Effective January 2026 for the Telehealth Program" (PDF) — https://digitalassets.jointcommission.org/api/public/content/522dbd2850484f29bf178a94fa1feffa?v=8c7d2597
- Joint Commission, "National Performance Goals" — https://www.jointcommission.org/en-us/standards/national-performance-goals
- Joint Commission NPSGs (general) — https://www.jointcommission.org/en-us/standards/national-patient-safety-goals
- 2026 Ambulatory Health Care NPSGs — https://digitalassets.jointcommission.org/api/public/content/3103ce682c16469a8d8d5425e9082df9?v=1912053f

### 5.3 Communication tracking & audit trail

Modern best practice:
- Every critical finding notification has a **time-stamped, immutable log** of: finding time, who flagged it, to whom communicated, by what channel, when acknowledged, escalation steps if no answer.
- A **fail-safe escalation policy** when the responsible provider can't be reached (escalate to covering, then to department chair, then to CMO).
- **NLP-based detection** of critical terms in the radiologist's draft report to trigger the workflow automatically.
- **Coded priority levels** standardized across the department (red/orange/yellow) so the receiving provider can triage.

**Sources:**
- Vizient PSO — https://vizientinc-delivery.sitecorecontenthub.cloud/api/public/content/f5f2113f76fc45198342f61d4f91dc99
- ProAssurance — https://riskmanagement.proassurance.com/article-library/develop-a-process-for-communicating-results-based-on-criticality-to-improve-clinical-decision-making

### 5.4 Time-to-notify metrics

Industry benchmarks:
- Mean CF→notification 8.8 min (AJNR 2014, 91 cases); 72.5% within 10 min, 93.4% within 15 min.
- Lab median 4-6 min from knowledge to notification (CAP Q-Probes).
- Viz.ai LVO stroke: 31-min door-to-needle reduction, 44% faster LVO diagnosis.

**Status in product:** ❌ Not implemented. **2026 stance:** **Table stakes** for accreditation (CIHQ, Joint Commission International, GAHAR in Egypt); **competitive advantage** when you ship a real-time notification dashboard with mobile app.

---

## 6. Radiation Dose (2026)

### 6.1 ICRP / ICRU guidance

The Image Wisely / Image Gently campaigns continue to drive the **ALARA** ("As Low As Reasonably Achievable") principle, with diagnostic reference levels (DRLs) and achievable doses (ADs) for adult and pediatric exams. The campaigns have issued 2026 annual renewal pledges (imagegently.org).

**Sources:**
- Image Gently (2026 pledge) — http://www.imagegently.org/
- Image Wisely (Radiation Risk page) — https://www.imagewisely.org/Imaging-Modalities/Computed-Tomography/How-to-Understand-and-Communicate-Radiation-Risk
- Image Wisely (Pediatric CT and Image Gently) — https://www.imagewisely.org/Imaging-Modalities/Computed-Tomography/Pediatric-CT-and-Image-Gently
- Image Wisely home — https://www.imagewisely.org/

### 6.2 MIPS #145, #360, #364, #494 (US CMS — relevant as a reference benchmark)

| Measure | Title | 2026 status |
|---|---|---|
| **MIPS 145** | Radiology: Exposure Dose Indices Reported for Procedures Using Fluoroscopy | Final fluoroscopy reports must document at least one of: Reference air kerma (Ka,r), Kerma-area product (PKA) / DAP, or Peak skin dose (PSD) |
| **MIPS 360** | Optimizing Patient Exposure to Ionizing Radiation: Count of Potential High Dose Radiation Imaging Studies (CT and cardiac nuclear medicine) | Report must include count of prior CT/nuclear studies in 12 months prior |
| **MIPS 364** | Optimizing Patient Exposure: Appropriateness: Follow-up CT for Incidentally Detected Pulmonary Nodules | Report must include Fleischner-style follow-up recommendation |
| **MIPS 494** | Excessive Radiation Dose or Inadequate Image Quality for Diagnostic CT in Adults (Clinician Level) | eCQM; out-of-range dose or image quality triggers; uses NQF-endorsed thresholds |

**Sources:**
- MDInteractive 2026 MIPS 145 — https://mdinteractive.com/mips_quality_measure/2026-mips-quality-measure-145
- MDInteractive 2026 MIPS 360/364/494 — https://mdinteractive.com/2026_MIPS_radiology
- VBCA MIPS 145 — https://www.vbca.com/measures/2026/MIPS145-quality-measure-radiology-exposure-dose-indices-reported-procedures-using-fluoroscopy/
- MDInteractive MIPS 494 — https://mdinteractive.com/mips_quality_measure/2026-mips-quality-measure-494

**Status in product:** ❌ Not implemented. **2026 stance:** **Table stakes** in any Western market; **competitive advantage** in Egypt/MENA — building dose dashboards now is ahead of regional regulation.

### 6.3 RadLex / RSNA playbook mapping

RadLex (RSNA's radiology lexicon) and the RSNA Common Data Elements (CDE) project provide the controlled terminology for body part, modality, protocol, and indication. The **ACR Dose Index Registry (DIR)** is the national US registry that ingests RDSR data and benchmarks facility dose against regional and national values by standardized exam name and patient size.

**Sources:**
- DiagnosticRadPhys CT Dose Index Monitoring — https://www.diagnosticradphys.com/physicspulse/diagnostic-medical-physics/ct-radiation-dose-index-monitoring/
- DICOM Radiation Dose Recording — https://www.dicomstandard.org/using/radiation/

**Status in product:** ❌ Not implemented. **2026 stance:** **Competitive advantage** — RadLex mapping enables a future Dose Registry play and is required for the RSNA CDE-based AI workflows.

### 6.4 Cumulative dose per patient

Build a longitudinal patient dose record that sums CTDIvol, DLP, and effective dose across all imaging encounters. Surfacing it in the order-entry step helps prevent unnecessary repeat scans and supports the **MIPS 360 "count of prior CT"** rule.

**Status in product:** ❌ Not implemented. **2026 stance:** **Differentiator** — most PACS can show current-study dose, but very few maintain patient-cumulative views.

---

## 7. Workflow / UX (2026)

### 7.1 Modality worklist UI

Modern MWL UIs let the technologist filter by modality, body part, scheduled time, status (waiting/in-room/completed), and patient ID. The worklist auto-populates from the RIS via HL7 ORM (or FHIR ServiceRequest). Cornerstone3D integrates with the worklist as a thumbnail of the first series.

**Sources:**
- PACS Boot Camp, "DICOM Modality Worklist" — https://pacsbootcamp.com/dicom-modality-worklist/
- Medicai, "Radiology Dictation Software, Voice Recognition, and Worklist" — https://blog.medicai.io/en/radiology-dictation-software/

**Status in product:** ❌ Not implemented. **2026 stance:** **Table stakes**.

### 7.2 AI-augmented reading

- Pre-read: triage AI marks suspicious studies with a flag/badge in the worklist.
- In-reader: SEG overlay, GSPS annotations, measurements, side-by-side priors with alignment.
- Post-read: AI populates the report template (impression, follow-up rec, critical-finding flag).

**Status in product:** ❌ Not implemented. **2026 stance:** **Competitive advantage**.

### 7.3 Real-time collaboration (teleradiology chat)

Slack-style chat per study, with mention, file share, voice clip, and "hot seat" handoff between time zones. Built into Visage, Ambra / Intelerad, and Sectra's enterprise imaging.

**Status in product:** ❌ Not implemented. **2026 stance:** **Competitive advantage** — particularly important for teleradiology hubs in Egypt serving Gulf / Africa.

### 7.4 Speech recognition

| Vendor | Share | Notes |
|---|---|---|
| **Nuance PowerScribe One** (Microsoft) | ~80% of US radiology departments (KLAS 2025) | Real-time dictation, structured templates, AI-generated impressions, follow-up tracking |
| **3M / Solventum MModal Fluency for Imaging** | Second-largest | NLP-driven structured data extraction |
| **Rad AI Reporting & Impressions** | Fast-growing | AI-drafted impressions, voice editing; sits *alongside* PowerScribe/MModal |
| **DeepScribe Radiology, Dolbey Fusion** | Niche | Smaller share |
| **OpenAI Whisper / cloud ASR** | Emerging | Open-weight; can be trained on radiology data; used in some cloud-native PACS as the ASR engine, with a radiology-specific LM on top |

**Sources:**
- Gitnux, "Top 10 Best Radiology Speech Recognition Software of 2026" — https://gitnux.org/best/radiology-speech-recognition-software/
- ScribeMed, "Radiology Transcription Guide 2026" — https://www.scribemed.com/radiology-transcription.html
- Applied Radiology, "Nuance Leads the Way" — https://appliedradiology.com/articles/nuance-leads-the-way-in-ai-powered-solutions
- Nuance white paper, "PowerScribe One: Crossing the Great Divide" — https://www.nuance.com/content/dam/nuance/en_us/collateral/healthcare/white-paper/wp-powerscribe-one-crossing-the-great-divide-en-us.pdf
- Medicai, "Radiology Dictation Software" — https://blog.medicai.io/en/radiology-dictation-software/

**Status in product:** ❌ Not implemented. **2026 stance:** **Table stakes for Arabic** (radiologists in Egypt will not tolerate typing); **competitive advantage** for English/non-Arabic.

### 7.5 Structured reporting templates (BI-RADS, LungRADS, TI-RADS, C-RADS, etc.)

The ACR Reporting and Data Systems (RADS) family: **BI-RADS** (breast), **C-RADS** (colonography), **CAD-RADS** (coronary CTA), **LI-RADS** (liver), **Lung-RADS** (lung screening), **NI-RADS** (head/neck), **O-RADS** (adnexal), **PI-RADS** (prostate), **TI-RADS** (thyroid). These need:
- Pre-built structured templates with pickable fields and category codes.
- Auto-calculations (e.g., Lung-RADS mean diameter from long + short axis).
- Mapping to ICD-10, SNOMED-CT, RadLex.

**Sources:**
- ACR Reporting and Data Systems (RADS) — https://www.acr.org/Clinical-Resources/Clinical-Tools-and-Reference/Reporting-and-Data-Systems
- ACR Lung-RADS — https://www.acr.org/Clinical-Resources/Clinical-Tools-and-Reference/Reporting-and-Data-Systems/Lung-RADS
- Radiopaedia Lung-RADS — https://radiopaedia.org/articles/lung-imaging-reporting-and-data-system-lung-rads
- PMC PMC7251936, RADS overview — https://pmc.ncbi.nlm.nih.gov/articles/PMC7251936/

**Status in product:** ❌ Not implemented. **2026 stance:** **Table stakes** for breast and lung screening; **competitive advantage** in Egypt where structured reporting is rare.

### 7.6 Peer review / RADPEER

Active participation in a **score-based peer review program is required** for ACR accreditation (CT, MR, NM, PET, US, breast US, breast MRI). Options: RADPEER, vendor product, or self-built. Required features:
- Double-reading assessment
- Random selection of representative studies
- 4-point scoring scale (concordance)
- Action policy for discrepant findings
- Per-physician and per-modality summary stats
- Modern alternative: ACR's "Peer Learning" program (continuous learning, no scoring).

**Sources:**
- ACR RADPEER — https://www.acr.org/Clinical-Resources/Clinical-Tools-and-Reference/RADPEER
- ACR Physician QA Requirements (revised 3-4-2025) — https://accreditationsupport.acr.org/support/solutions/articles/11000068451-physician-qa-requirements-ct-mri-nuclear-medicine-pet-ultrasound-revised-3-4-2025-
- ACR RADPEER (revised 12-12-19) — https://accreditationsupport.acr.org/support/solutions/articles/11000071904-radpeer-revised-12-12-19-
- RADPEER User Instructions — https://www.acr.org/-/media/ACR/Files/Radpeer/User-Guide-Admin.pdf

**Status in product:** ❌ Not implemented. **2026 stance:** **Table stakes** for any ACR-accredited site; **competitive advantage** in Egypt where peer review is rarely systematic.

### 7.7 Critical results / non-voice communication

Modern systems support **HIPAA-compliant text**, encrypted in-app messaging, and EHR-embedded alerts. TJC allows non-voice when read-back is documented; the system must capture the read receipt and escalation chain.

**Sources:**
- Vizient PSO — https://vizientinc-delivery.sitecorecontenthub.cloud/api/public/content/f5f2113f76fc45198342f61d4f91dc99

**Status in product:** ❌ Not implemented. **2026 stance:** **Table stakes**.

---

## 8. Egypt / MENA Specific

### 8.1 Egyptian MoHP requirements for PACS

There is **no single MoHP-issued PACS technical standard** comparable to the DoH Abu Dhabi "Radiology and Medical Imaging Standard" (DOH/ST/HCFS/RMIS/V1/2024, effective August 2024). The DoH Abu Dhabi standard mandates:
- PACS license per facility
- Federal Authority for Nuclear Regulation license for ionizing radiation
- Radiation protection officer + medical radiation protection committee
- All patient data stored in the UAE per federal ICT-in-health laws

Egypt's **Universal Health Insurance Authority (UHIA / UHIS)** is the de-facto national health-IT standard-setter. The Egypt Healthcare Authority (EHA) runs the rollout.

**Sources:**
- DoH Abu Dhabi, "Radiology and Medical Imaging Standard" (DOH/ST/HCFS/RMIS/V1/2024) — https://www.doh.gov.ae/-/media/1D754BE9B16E4008BAE7BECF01EE6F11.ashx
- DoH Abu Dhabi, "Scope of Practice for Radiologists" — https://www.doh.gov.ae/-/media/20CB05082CBC43709B50639827734A3E.ashx
- Ahram Online, "Egypt digitizes 265 primary healthcare facilities, launches UHIS pilot in Minya" — https://english.ahram.org.eg/NewsContentMulti/573309/Multimedia.aspx
- Egypt Healthcare Authority digital transformation page — https://eha.gov.eg/en/news/highlights-transformation/
- SIS, "Egypt eyes AI implementation in healthcare sector" — https://www.sis.gov.eg/Story/204287/Egypt-eyes-AI-implementation-in-healthcare-sector?lang=
- Ahram Online, "Egypt's UHIS delivers 105 mln services" — https://english.ahram.org.eg/News/566307.aspx
- METI Japan Egypt healthcare country report (PDF) — https://healthcare-international.meti.go.jp/files/parts/2025/countryreport_egypt_PDF.pdf

**Concrete EHA/UHIA facts (FY 2024/25):**
- 4.5M (later 6M) electronic health records created
- 500M+ radiology images in archive
- RIS/PACS deployed at 94 facilities in phase 1
- Phase 2 covers 5 new governorates, ~70 hospitals, ~12M beneficiaries
- Phase 1 finished in Aswan (Jul 2025), starting in Minya Apr 2026
- 42M (later 81M) electronic prescriptions issued
- Egypt: first EMR system in North Africa/Eastern Mediterranean to implement **ICD-11**
- Plan: 6,000 family medicine units, 1,000 hospitals by 2030
- 100% of primary healthcare centers in phase-1 governorates fully digitized

**Local implementation partner:** Millensys (Egypt) is the RIS/PACS vendor implementing the UHIA national archive, AI for cancer screening, teleradiology, and the Ismailia Virtual Hospital.

**Sources:**
- LinkedIn (Fouad Elsharkwy, Millensys) on UHIA & Millensys partnership — https://www.linkedin.com/posts/fouad-elsharkwy-212625294_healthcare-radiology-telerad-activity-7399380441125859329-yLoF

**Status in product:** ❌ Not implemented. **2026 stance:** **Table stakes** to be UHIA-compatible (RIS/PACS standards, ICD-11, integrated EMR, Arabic UI). Millensys dominates the public-sector RFP; private centers are the open opportunity.

### 8.2 National ID / civil registry integration

The Egyptian National ID is the standard MRN. Any RIS must:
- Validate against the national civil registry (Hawiyati / الرقم القومي)
- Carry the 14-digit national ID as the primary patient identifier
- Support Arabic and English names
- Handle the very common case of a single person with multiple MRNs across facilities (Egypt has no mature national MPI)

**Sources:**
- Egyptian Health Council rules and conditions — https://www.ehc.gov.eg/rules-and-conditions
- METI Japan Egypt healthcare country report (PDF) — https://healthcare-international.meti.go.jp/files/parts/2025/countryreport_egypt_PDF.pdf

**Status in product:** ❌ Not implemented. **2026 stance:** **Table stakes** — every RIS in Egypt uses national ID; the patient-merge / MPI story is a differentiator.

### 8.3 Insurance integration (Egyptian payer landscape)

Major payers a 2026 RIS must talk to:
- **Egyptian Health Insurance Organization (HIO)** — the public insurer for the formal sector, now folded into UHIA
- **Misr Insurance** (largest state-owned P&C and life)
- **AXA Egypt** (formerly Egypt International Insurance, post AXA acquisition)
- **GIG Egypt (Arabian Misr Insurance Group / GIG-Egypt)** — formerly Egyptian Saudi Insurance
- **Allianz Egypt, MetLife Alico, RSA**
- **Privately managed care** (MedNet, AXA OneHealth, GlobeMed)
- **MOH claims** for non-UHIA governorates

Payer integration is via HL7 v2 (pre-authorization, eligibility, claims) and increasingly FHIR R4 (Coverage, Claim, ClaimResponse). Egypt's UHIS uses a **DRG-based** reimbursement for inpatient and a **fee-for-service** schedule for outpatient, both requiring machine-readable ICD-11 coding.

**Sources:**
- METI Japan Egypt healthcare country report (PDF) — https://healthcare-international.meti.go.jp/files/parts/2025/countryreport_egypt_PDF.pdf
- Ahram Online UHIS article — https://english.ahram.org.eg/NewsContentMulti/573309/Multimedia.aspx

**Status in product:** ❌ Not implemented. **2026 stance:** **Table stakes for UHIA facilities**, **competitive advantage** for private insurance.

### 8.4 Arabic reporting templates

- Right-to-left (RTL) UI for all forms
- Arabic medical terminology (SNOMED-CT Arabic, ICD-11 Arabic) embedded in templates
- Mixed Arabic + Latin script (clinical notes often mix both)
- Diacritics-handling search
- Arabic-specific structured templates (e.g., the Egyptian Society of Radiology's local variants of BI-RADS / TI-RADS)

**Status in product:** ❌ Not implemented. **2026 stance:** **Table stakes** for any Egyptian deployment. **Competitive advantage** to ship first-class Arabic + English bi-directional templates with voice recognition tuned for Egyptian Arabic.

### 8.5 Egypt Healthcare Data Protection Law (PDPL) — Law 151/2020

Key facts as of 2026:
- **Law No. 151 of 2020** entered into force October 2020.
- **Ministerial Decree No. 816 of 2025** activated the executive regulations on **1 November 2025**.
- **Full enforcement: 31 October 2026** (one-year grace from activation).
- **Regulator:** Personal Data Protection Center (PDPC), under the Ministry of Communications and Information Technology.
- **Mandatory pre-authorization licensing regime** (unusual vs. EU self-assessment) — licence fees up to **EGP 2,000,000**, permits up to **EGP 500,000**, 90-day decision window with silence = rejection.
- **Mandatory DPO appointment** for every legal-entity controller/processor.
- **Breach notification to PDPC within 72 hours** (immediately where national security); data subjects notified within 3 days.
- **Cross-border transfer** is restricted: destination must have "at least equivalent" protection, plus a separate licence. Sub-threshold transfers only on explicit consent + listed grounds (medical care, legal claims, contract performance, judicial cooperation, public interest, money transfers, treaties).
- **Children under 15** require explicit written guardian consent; children's data is always "sensitive."
- **Penalties:** Imprisonment and/or fines up to **EGP 5,000,000**.

**Practical impact on a PACS:**
- Health data is automatically **sensitive personal data** → a specific PDPC permit is required.
- Storing imaging studies in AWS HealthImaging / Azure DICOM / GCP DICOM Store outside Egypt likely requires a cross-border transfer licence.
- Multi-tenant SaaS must implement per-tenant data isolation that can be proven to PDPC.
- DPO must be appointed and registered before the 31 Oct 2026 deadline.
- Breach detection + 72-hour notification playbook is mandatory.

**Sources:**
- Andersen Egypt, full text of Law 151/2020 — https://eg.andersen.com/wp-content/uploads/2025/06/Law-No.-151-OF-2020-1.pdf
- LawLab Africa, "Data Protection in Egypt" — https://research.lawlab.africa/egypt/
- DLA Piper Data Protection — Egypt — https://www.dlapiperdataprotection.com/?t=law&c=EG
- Anove, "Egypt - Personal Data Protection Law No. 151 (2020)" — https://www.anove.ai/en/regulations/egypt-pdpl
- Recording Law, "Egypt Data Privacy Laws: PDPL Law 151/2020 and the 2025 regulations" — https://www.recordinglaw.com/world-laws/world-data-privacy-laws/egypt-data-privacy-laws/

**Status in product:** ❌ Not implemented. **2026 stance:** **Table stakes** — must be in place before 31 Oct 2026 enforcement. Build with EU-GDPR / HIPAA controls as the floor and add the PDPC-specific licence, DPO registration, and 72-hour breach notification workflows on top.

---

## 9. Cost / Build vs Buy

### 9.1 Build vs buy in 2026 — typical MENA cost

**MENA greenfield PACS/RIS cost (per Franance Health Systems, Egypt-specific 2026 figures, in EGP):**

| Cost component | Small clinic | Mid-size center | Multi-site |
|---|---|---|---|
| Software licensing (perpetual/initial) | 200,000–500,000 | 500,000–2,000,000 | 2,000,000+ |
| Implementation & project management | 150,000–300,000 | 300,000–1,000,000 | 1,000,000+ |
| Hardware (servers, storage, workstations) | 100,000–200,000 | 200,000–750,000 | 750,000+ |
| Data migration | 50,000–150,000 | 150,000–500,000 | 500,000+ |
| Integration with HIS/LIS/billing (per integration) | 50,000–100,000 | 100,000–300,000 | 300,000+ |
| Customization & development | 30,000–100,000 | 100,000–500,000 | 500,000+ |
| Training & change management | 30,000–80,000 | 80,000–200,000 | 200,000+ |
| **Annual support & maintenance** | **~15–25% of initial software cost** | | |
| **Total initial investment** | **510,000–1,430,000** | **1,430,000–5,750,000** | **5,750,000+** |

**UAE / GCC equivalents (AED, mid-size hospital):** software licensing AED 200k–450k/yr, implementation AED 120k–300k, HIS integration AED 100k–250k, data migration AED 80k–180k, training AED 30k–70k, support AED 50k–120k/yr.

**Global US benchmarks (Folio3 2026):** 5–10-year TCO $350k–$20M+ depending on scale; per-study $0.50–$3.00; named-user SaaS $40–$150/user/month.

**Sources:**
- Franance Health Systems, "PACS/RIS Migration & Integration in Egypt" — https://franance.com/egypt/services/digital-health/pacs-ris-migration
- Sisgain, "How UAE Hospitals Can Procure an AI-Ready RIS and PACS" — https://sisgain.ae/blogs/ai-ready-ris-pacs-uae-hospitals
- Folio3 Digital Health, "PACS Solution Cost Breakdown and Budget Planning for 2026" — https://digitalhealth.folio3.com/blog/pacs-solution-cost-breakdown-and-budget-planning/
- Intrazero, "Best Hospital Information System (HIS) 2026" (regional comparison) — https://www.intrazero.com/en/blog/best-hospital-information-systems
- Taction, "DICOM AI Clinical Imaging Pipeline: 2026 Build Guide" (off-the-shelf vs custom build costs) — https://www.tactionsoft.com/blog/dicom-ai-clinical-imaging-pipeline/

### 9.2 Open-source options

| Tool | Language | Role | License | Best for | Maturity 2026 |
|---|---|---|---|---|---|
| **Orthanc** | C++ | Lightweight DICOM server + REST API + built-in viewer | GPLv3 | Small clinics, research, gateway, low-resource | Core updates slow; Docker/images refreshed 2026 |
| **dcm4chee / dcm4chee-arc-light** | Java | Enterprise PACS / VNA, full IHE profile set, HL7 + FHIR | MPL 2.0 | Multi-tenant SaaS, enterprise | Active, 2026 updates |
| **OHIF Viewer** | TypeScript / React | Zero-footprint web viewer on top of Cornerstone3D | MIT | Best-in-class web viewer for any PACS | v3.12.4 Jun 2026, v3.13.0 in beta, 4,200+ stars |
| **Weasis** | Java | Desktop + web DICOM viewer, OpenCV, multi-format | Apache 2.0 | Hospitals preferring desktop-class viewer | May 2026 commits |
| **Dicoogle** | Java | PACS archive + research-grade indexing (MongoDB/Elasticsearch) | GPLv3 | Teaching, research, plug-in PACS | 2026 updates |
| **Cornerstone3D** | TypeScript | Underlying DICOM rendering engine for OHIF | MIT | Build-your-own viewer | The standard |

**Open-source stack reference architecture (pistack 2026):**
- Orthanc as the DICOM router/gateway
- dcm4chee as the long-term archive / IHE actor
- OHIF Viewer as the radiologist's web workstation
- Dicoogle as the research/secondary index

5-year TCO of this stack vs. a commercial enterprise viewer: $320,000–$400,000+ saved per deployment. OHIF itself is not a certified medical device for primary diagnostic use; deployment must be put through medical device assessment (IEC 62304, ISO 14971, CE/FDA).

**Sources:**
- pistack, "Self-Hosted DICOM/PACS Medical Imaging Servers" (2026-06-04) — https://www.pistack.xyz/posts/2026-06-04-self-hosted-dicom-pacs-medical-imaging-orthanc-dcm4che-ohif-dicoogle-guide/
- Orthanc home — https://www.orthanc-server.com/
- dcm4che (project hub) — https://dcm4che.github.io/
- dcm4chee-arc-light 5 — https://web.dcm4che.org/dcm4chee-arc-light
- DICOMweb dcm4che documentation — https://dcm4che.github.io/dicomweb/
- OHIF Viewer docs — https://docs.ohif.org/
- OHIF Viewer 2026 review — https://valuestreamai.com/blog/ohif-viewer-free-web-medical-imaging-2026
- Weasis GitHub — https://github.com/nroduit/weasis
- Noze, "OHIF Viewer: the Open Source zero-footprint browser-based PACS" — https://www.noze.it/en/insights/ohif-viewer-open-source-pacs/
- PMC, "The Orthanc Ecosystem for Medical Imaging" — https://pmc.ncbi.nlm.nih.gov/articles/PMC5959835/
- WorldMetrics, "Top 10 Best PACS Medical Software (2026)" — https://worldmetrics.org/best/pacs-medical-software/
- WorldMetrics, "Top 9 Best DICOM Router Software of 2026" — https://worldmetrics.org/best/dicom-router-software/

### 9.3 Reference products

| Vendor | Product | 2026 standing | Best for | Pricing model |
|---|---|---|---|---|
| **Sectra** | Sectra One Cloud (Azure) | **#1 Best in KLAS, 13th year**; ~60% consideration rate among US PACS decisions | High-volume hospitals, academic centers | Per-study / license, quote-based |
| **Visage Imaging** | Visage 7 (private cloud / AWS) | #2 net-new selections; **server-side rendering** = fast on 3D | Academic, teleradiology, large datasets | Premium quote-based |
| **Fujifilm** | Synapse 5+ | VNA-first, KLAS VNA top-tier | Enterprise imaging strategies, pathology + cardiology | Quote-based |
| **Agfa HealthCare** | Enterprise Imaging | **2026 Best in KLAS VNA** (89.8% satisfaction, 2 years running) | Multi-department enterprise | Quote-based |
| **Intelerad / Ambra** | IntelePACS / Ambra cloud | 10B+ images, 130M+ exams/yr, ~2,000 customers incl. Johns Hopkins, NYP | Image exchange, multi-site | Subscription, quote-based |
| **Philips** | HealthSuite Imaging | Rebuilt cloud offering on AWS | Single-vendor cloud | Subscription |
| **GE HealthCare** | True PACS | Largest legacy install (Centricity) | Sites on GE modality fleets | Quote-based |
| **INFINITT PACS** | INFINITT PACS | 2026 KLAS-recognized riser, **lower TCO** | Mid-size hospitals on a budget | Quote-based |
| **Carestream (now Onex)** | PACS / Vue PACS | Mature on-prem | Mid-size and enterprise | Quote-based |
| **Mach7** | Mach7 Unity | Cloud-connected, 6.8/10 in 2026 reviews | Distributed reading, teleradiology | Quote-based |
| **Merge PACS (Merative)** | Merge PACS | 9.1/10 in 2026 reviews, 2026 KLAS-recognized | Epic-heavy academic networks | Quote-based |
| **Konica Minolta** | Exa PACS | Strong user scores | Imaging centers, ortho groups | Modular licensing |
| **RamSoft** | OmegaAI | Emerging cloud-native | Outpatient radiology | Usage-based subscription |
| **Millensys** (Egypt) | RIS / PACS | The UHIA national rollout partner | Egyptian public sector, MENA | Quote-based |
| **PACSHealth** | Dose monitoring | Niche | Dose monitoring overlay | Subscription |

**Sources:**
- Medicai, "Best Cloud PACS Vendors" — https://blog.medicai.io/en/cloud-pacs-vendors/
- Pacscribe, "13 Best PACS Systems for Radiology in 2026" — https://pacscribe.com/blogs/13-best-pacs-systems-for-radiology-in-2026/
- WorldMetrics, "Best Teleradiology PACS Software (2026)" — https://worldmetrics.org/best/teleradiology-pacs-software/
- KLAS Research, "The US Imaging Market Is Hot—Which PACS Vendors Are the Most Competitive?" — https://engage.klasresearch.com/blog/the-us-imaging-market-is-hot-which-pacs-vendors-are-the-most-competitive/8348/
- Medicai, "Best Vendor-Neutral Archives in 2026" — https://blog.medicai.io/en/best-vendor-neutral-archives/

**Status in product:** ❌ Not implemented. **2026 stance:** Build is feasible if you accept the 2-3 year roadmap; buy (or open-source-plus) is realistic for a fast launch.

### 9.4 Recommended build vs buy for the MENA mid-tier

Given MaxP's existing platform (Node.js + Prisma + React + Cornerstone.js) and the target market (mid-size Egypt/MENA centers), a pragmatic 
