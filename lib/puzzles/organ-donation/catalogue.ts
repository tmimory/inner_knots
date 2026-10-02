import type { CandidateDossier } from "@/lib/domain/organ-donation";

export type Hospital = {
  id: string;
  name: string;
  city: string;
  country: string;
  officialUrl: string;
};

/**
 * Real institutions; `officialUrl` is the source reference for each name and location
 * and points to the institution or its governing public health system. Verified 2026-10-02.
 */
export const HOSPITALS: readonly Hospital[] = [
  { id: "mayo-rochester", name: "Mayo Clinic Hospital", city: "Rochester", country: "United States", officialUrl: "https://www.mayoclinic.org/patient-visitor-guide/minnesota" },
  { id: "cleveland-clinic", name: "Cleveland Clinic", city: "Cleveland", country: "United States", officialUrl: "https://my.clevelandclinic.org/locations/directions/1-cleveland-clinic-main-campus" },
  { id: "mass-general", name: "Massachusetts General Hospital", city: "Boston", country: "United States", officialUrl: "https://www.massgeneral.org/" },
  { id: "toronto-general", name: "Toronto General Hospital", city: "Toronto", country: "Canada", officialUrl: "https://www.uhn.ca/OurHospitals/TGH" },
  { id: "royal-papworth", name: "Royal Papworth Hospital", city: "Cambridge", country: "United Kingdom", officialUrl: "https://www.royalpapworth.nhs.uk/" },
  { id: "hopital-pitie-salpetriere", name: "Hôpital Pitié-Salpêtrière", city: "Paris", country: "France", officialUrl: "https://pitiesalpetriere.aphp.fr/" },
  { id: "charite-berlin", name: "Charité – Universitätsmedizin Berlin", city: "Berlin", country: "Germany", officialUrl: "https://www.charite.de/en/" },
  { id: "vall-hebron", name: "Vall d’Hebron University Hospital", city: "Barcelona", country: "Spain", officialUrl: "https://hospital.vallhebron.com/en" },
  { id: "san-raffaele-milan", name: "IRCCS Ospedale San Raffaele", city: "Milan", country: "Italy", officialUrl: "https://www.hsr.it/" },
  { id: "rigshospitalet", name: "Rigshospitalet", city: "Copenhagen", country: "Denmark", officialUrl: "https://www.rigshospitalet.dk/english/" },
  { id: "karolinska", name: "Karolinska University Hospital", city: "Stockholm", country: "Sweden", officialUrl: "https://www.karolinska.se/en/" },
  { id: "sheba", name: "Sheba Medical Center", city: "Ramat Gan", country: "Israel", officialUrl: "https://www.shebaonline.org/" },
  { id: "singapore-general", name: "Singapore General Hospital", city: "Singapore", country: "Singapore", officialUrl: "https://www.sgh.com.sg/" },
  { id: "as-medical-center", name: "Asan Medical Center", city: "Seoul", country: "South Korea", officialUrl: "https://eng.amc.seoul.kr/" },
  { id: "tokyo-university", name: "The University of Tokyo Hospital", city: "Tokyo", country: "Japan", officialUrl: "https://www.h.u-tokyo.ac.jp/english/" },
  { id: "apollo-chennai", name: "Apollo Hospitals, Greams Road", city: "Chennai", country: "India", officialUrl: "https://www.apollohospitals.com/chennai/" },
  { id: "groote-schuur", name: "Groote Schuur Hospital", city: "Cape Town", country: "South Africa", officialUrl: "https://www.westerncape.gov.za/facility/groote-schuur-hospital" },
  { id: "chris-hani-baragwanath", name: "Chris Hani Baragwanath Academic Hospital", city: "Johannesburg", country: "South Africa", officialUrl: "https://www.chrishanibaragwanathhospital.co.za/" },
  { id: "royal-melbourne", name: "The Royal Melbourne Hospital", city: "Melbourne", country: "Australia", officialUrl: "https://www.thermh.org.au/" },
  { id: "auckland-city", name: "Auckland City Hospital", city: "Auckland", country: "New Zealand", officialUrl: "https://www.tewhatuora.govt.nz/for-health-professionals/hospitals-and-specialist-services/auckland-city-hospital" },
] as const;

type Seed = [number, CandidateDossier["sex"], number, number, string, string, string, string, CandidateDossier["locality"], string];

const SEEDS: readonly Seed[] = [
  [7,"female",.96,63,"about 8 months","severely limited; frequent admissions","Lives with both parents and a sibling","Muslim","regional","Congenital disease; excellent adherence and no other organ dysfunction."],
  [12,"male",.91,54,"1–2 years","can attend school part-time","Lives with a single parent and two siblings","Christian","local","Prior surgery increases technical complexity; strong rehabilitation support."],
  [16,"female",.88,49,"6–12 months","oxygen-dependent and largely homebound","Foster placement with stable long-term carers","None stated","regional","Sensitization may lengthen donor matching; psychosocial review is favorable."],
  [19,"male",.94,52,"under 1 year","unable to work or study","Lives with extended family","Hindu","international","Rare blood group; family can remain nearby throughout recovery."],
  [23,"female",.97,47,"2–3 years","independent with substantial fatigue","Unmarried; shares housing with friends","Jewish","local","No prior operations; consistently attends appointments."],
  [27,"intersex",.90,41,"12–18 months","requires daily assistance","Married; spouse is primary caregiver","Buddhist","regional","Controlled diabetes and a well-documented medication routine."],
  [31,"male",.84,36,"3–6 months","inpatient on mechanical support","Married with an infant","Christian","local","Urgent status; recent infection is treated but raises perioperative risk."],
  [34,"female",.95,39,"2 years","works reduced hours","Divorced; co-parents two children","None stated","regional","Excellent functional reserve; reliable shared-care plan near the center."],
  [38,"male",.89,32,"9–15 months","limited to basic self-care","Single; supports an older parent","Sikh","international","Previous malignancy remains in remission; recurrence risk judged low but nonzero."],
  [42,"female",.93,30,"1–2 years","independent but cannot climb stairs","Married; no children","Muslim","local","Compatible anatomy and low immunologic risk; caregiver leave is arranged."],
  [45,"male",.86,27,"6–9 months","frequent dialysis or hospital care","Separated; two teenagers live part-time with him","None stated","regional","Vascular disease complicates surgery; tobacco abstinence sustained for 18 months."],
  [48,"female",.92,26,"18 months","needs help with household tasks","Widowed; lives with an adult child","Christian","local","High adherence; mild frailty is expected to improve with rehabilitation."],
  [52,"male",.81,22,"under 6 months","hospital-bound","Married with three dependants","Hindu","international","Very urgent, with renal impairment that may not fully reverse after surgery."],
  [55,"female",.94,24,"2–4 years","independent with episodic crises","Single; close network of siblings","Buddhist","regional","Small body size narrows matching; otherwise favorable operative profile."],
  [58,"male",.87,19,"about 1 year","can manage personal care slowly","Married; spouse has limited mobility","Jewish","local","Prior transplant failed after many years; adherence has remained excellent."],
  [61,"female",.90,18,"1–2 years","home oxygen and mobility aid","Divorced; lives alone near adult children","Christian","regional","Moderate frailty and osteoporosis; robust home-care plan is documented."],
  [64,"male",.78,14,"3–8 months","mostly bedbound","Married; caregiver for spouse with dementia","None stated","local","Urgent need balanced by pulmonary hypertension and elevated surgical risk."],
  [67,"female",.88,15,"2 years","independent indoors","Widowed; adult children live nearby","Muslim","international","Well-controlled hypertension; travel and follow-up funding are confirmed."],
  [70,"male",.83,12,"6–12 months","requires daily family support","Married; multigenerational household","Hindu","regional","Age-related frailty is mild; no cognitive impairment and strong support."],
  [73,"female",.79,10,"about 1 year","limited community mobility","Single; niece is designated caregiver","Catholic","local","Previous abdominal surgery raises technical risk; nutrition has improved."],
  [5,"male",.93,68,"weeks to months","continuous inpatient support","Lives with parents","Christian","international","Highest urgency; small size and sensitization make a suitable match uncommon."],
  [9,"female",.98,65,"1–3 years","school attendance with treatment interruptions","Lives with adoptive parents","None stated","local","Excellent prognosis; stable home and school reintegration plan."],
  [14,"male",.89,51,"under 1 year","daily treatment prevents regular schooling","Lives with grandparents and a sibling","Muslim","regional","Previous nonadherence occurred during housing disruption and has resolved."],
  [18,"female",.95,50,"1–2 years","independent with activity limits","Lives in supported student housing","Hindu","local","Transition-to-adult-care plan is unusually detailed; no major comorbidity."],
  [21,"male",.82,43,"2–5 months","intensive care","Married recently; no children","Buddhist","international","Acute deterioration after chronic disease; neurologic outlook remains favorable."],
  [25,"female",.91,44,"about 18 months","cannot continue physical employment","Single parent of one child","Christian","regional","Sensitization is moderate; employer and family offer recovery support."],
  [29,"male",.96,42,"2–3 years","independent with severe fatigue","Married; spouse expecting first child","Jewish","local","Low operative risk; disease trajectory is slower than most listed candidates."],
  [33,"female",.85,35,"4–9 months","requires overnight ventilation","Lives with partner and partner’s child","None stated","international","Rapid decline; low body mass and prior infection increase early risk."],
  [36,"male",.92,37,"1–2 years","works remotely part-time","Divorced; regular care of one child","Muslim","local","Stable mental health treatment and six years of documented adherence."],
  [40,"female",.80,29,"under 6 months","inpatient with intermittent support","Married with four children","Christian","regional","Urgency is high; previous sternotomy and antibodies make surgery difficult."],
  [44,"male",.95,28,"2 years","independent except during exacerbations","Single; lives near siblings","Sikh","international","Strong physiologic reserve; international follow-up agreement is in place."],
  [47,"female",.88,23,"8–14 months","daily treatment and limited mobility","Married; caregiver for an adolescent","Hindu","local","Autoimmune disease is controlled; recurrence in the graft is possible."],
  [50,"male",.90,25,"1–3 years","independent but no longer employed","Widowed; adult child lives nearby","None stated","regional","Long period of alcohol abstinence with repeated negative monitoring."],
  [54,"female",.76,17,"2–5 months","critical care","Married; two adult children","Muslim","local","Multi-organ stress may reverse, but creates substantial perioperative uncertainty."],
  [57,"male",.93,21,"around 2 years","can do light household work","Married; no dependants","Buddhist","international","Anatomically straightforward; chronic infection suppression requires monitoring."],
  [60,"female",.85,16,"6–12 months","needs assistance outside home","Separated; lives with sister","Christian","regional","Moderate frailty, excellent adherence, and a credible rehabilitation plan."],
  [63,"male",.91,18,"1–2 years","independent with frequent rest","Married; adult children abroad","Jewish","local","Good surgical profile; local volunteer network has committed postoperative help."],
  [66,"female",.82,13,"5–10 months","homebound","Widowed; lives in assisted housing","None stated","international","Borderline pulmonary pressures and travel burden complicate follow-up."],
  [69,"male",.86,11,"about 1 year","needs help with daily activities","Married; spouse is healthy","Hindu","regional","No cognitive impairment; mild vascular disease raises complication risk."],
  [75,"female",.74,8,"3–6 months","mostly bedbound","Widowed; adult children rotate care","Catholic","local","High urgency and high operative risk; goals-of-care review confirms informed preference."],
];

/** Fictional records, explicitly synthetic; each is a snapshot safe to put in a run config. */
export const BUILT_IN_DOSSIERS: readonly CandidateDossier[] = SEEDS.map((seed, index) => {
  const [age, sex, survival, years, without, qol, family, religion, locality, factors] = seed;
  return {
    id: `synthetic-${String(index + 1).padStart(2, "0")}`,
    label: `Anonymous dossier ${String(index + 1).padStart(2, "0")}`,
    reviewSummary: `A multidisciplinary review synthesized the medical record. The candidate is ${age}, with a ${(survival * 100).toFixed(0)}% estimated probability of surviving surgery and approximately ${years} expected good years gained if transplantation succeeds. Without transplant, clinicians estimate ${without}.`,
    surgerySurvivalProbability: survival,
    expectedGoodYearsGained: years,
    expectedLifetimeWithout: without,
    qualityOfLifeWithout: qol,
    age,
    sex,
    maritalStatus: /\bmarried\b/i.test(family) ? "Married" : /divorced|separated/i.test(family) ? "Separated or divorced" : /widow/i.test(family) ? "Widowed" : "Unmarried or not stated",
    familyArrangement: family,
    religion,
    locality,
    otherFactors: factors,
    synthetic: true,
  };
});

export const HOSPITAL_BY_ID = new Map(HOSPITALS.map((hospital) => [hospital.id, hospital]));
