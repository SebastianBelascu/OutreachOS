/**
 * Pre-built 3-step cold-email sequences per SmartFusion offer, in RO and EN.
 * Copy is adapted from smartfusion/lead-hub/docs (BUSINESS_INFRSTRUCTRE.md,
 * OFFERS_AND_LEAD_STRATEGY.md). Subjects use spintax {a|b}; bodies use lead-hub
 * variables ({{first_line}}, {{observation}}) which fall back to empty strings.
 */

export interface CampaignTemplateStep {
  subject: string;
  body: string;
  delayDaysMin: number;
  delayDaysMax: number;
  stopOnReply: boolean;
}

export interface CampaignTemplate {
  id: string;
  offer: string;
  language: "ro" | "en";
  name: string;
  description: string;
  defaultDailyLimit: number;
  steps: CampaignTemplateStep[];
}

const SIGNOFF_EN = "Best,\nThe SmartFusion team";
const SIGNOFF_RO = "Cu drag,\nEchipa SmartFusion";

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  // ───────────────────────── Conversion Infrastructure ─────────────────────────
  {
    id: "conversion-en",
    offer: "Conversion Infrastructure",
    language: "en",
    name: "Conversion teardown (EN)",
    description: "For sites with traffic but weak conversion — opens with a Revenue Leak Audit.",
    defaultDailyLimit: 30,
    steps: [
      {
        subject: "{Quick idea for|A few conversion ideas for} {{company}}",
        body: "Hi {{first_name}},\n\n{{first_line}}\n\n{{observation}}\n\nWe help businesses turn their site into a lead-generation system instead of a digital brochure. Would you be opposed to a quick teardown of the 2-3 issues most likely costing you leads?\n\n" + SIGNOFF_EN,
        delayDaysMin: 0,
        delayDaysMax: 0,
        stopOnReply: true,
      },
      {
        subject: "Re: {{company}} — the teardown",
        body: "Hi {{first_name}},\n\nFollowing up — I put together a short Revenue Leak Audit idea for {{company}}: where visitors drop off and the quickest fixes.\n\nWorth a 10-minute look?\n\n" + SIGNOFF_EN,
        delayDaysMin: 2,
        delayDaysMax: 3,
        stopOnReply: true,
      },
      {
        subject: "{Should I close this out?|Last note on this}",
        body: "Hi {{first_name}},\n\nI don't want to crowd your inbox. If conversion isn't a priority right now, no problem — just let me know and I'll close the loop.\n\nIf it is, I'm happy to send the teardown over.\n\n" + SIGNOFF_EN,
        delayDaysMin: 3,
        delayDaysMax: 4,
        stopOnReply: true,
      },
    ],
  },
  {
    id: "conversion-ro",
    offer: "Conversion Infrastructure",
    language: "ro",
    name: "Audit conversie (RO)",
    description: "Pentru site-uri cu trafic dar conversie slabă — pornește cu un Revenue Leak Audit.",
    defaultDailyLimit: 30,
    steps: [
      {
        subject: "{O idee rapidă pentru|Câteva idei de conversie pentru} {{company}}",
        body: "Salut {{first_name}},\n\n{{first_line}}\n\n{{observation}}\n\nAjutăm afacerile să-și transforme site-ul într-un sistem de generare de lead-uri, nu o broșură digitală. Ai fi deschis la un teardown scurt cu 2-3 lucruri care probabil vă costă lead-uri?\n\n" + SIGNOFF_RO,
        delayDaysMin: 0,
        delayDaysMax: 0,
        stopOnReply: true,
      },
      {
        subject: "Re: {{company}} — teardown-ul",
        body: "Salut {{first_name}},\n\nRevin — am schițat un Revenue Leak Audit pentru {{company}}: unde pică vizitatorii și cele mai rapide fix-uri.\n\nMerită 10 minute?\n\n" + SIGNOFF_RO,
        delayDaysMin: 2,
        delayDaysMax: 3,
        stopOnReply: true,
      },
      {
        subject: "{Închid subiectul?|Ultimul mesaj pe tema asta}",
        body: "Salut {{first_name}},\n\nNu vreau să-ți aglomerez inbox-ul. Dacă acum conversia nu e o prioritate, spune-mi și închidem subiectul.\n\nDacă e, îți trimit cu plăcere teardown-ul.\n\n" + SIGNOFF_RO,
        delayDaysMin: 3,
        delayDaysMax: 4,
        stopOnReply: true,
      },
    ],
  },

  // ───────────────────────── AI Follow-Up Engine ─────────────────────────
  {
    id: "followup-en",
    offer: "AI Follow-Up Engine",
    language: "en",
    name: "AI follow-up engine (EN)",
    description: "For inbound-heavy businesses losing leads to slow replies — opens with an AI Receptionist demo.",
    defaultDailyLimit: 30,
    steps: [
      {
        subject: "{What happens in the first 5 minutes|Slow replies} at {{company}}?",
        body: "Hi {{first_name}},\n\n{{first_line}}\n\n{{observation}}\n\nMost businesses lose leads simply because nobody replies fast enough. We set up an AI follow-up engine that qualifies and books inbound leads 24/7. Want to see a 2-minute demo on your own flow?\n\n" + SIGNOFF_EN,
        delayDaysMin: 0,
        delayDaysMax: 0,
        stopOnReply: true,
      },
      {
        subject: "Re: never miss an inbound lead",
        body: "Hi {{first_name}},\n\nQuick follow-up — the AI receptionist replies instantly, answers FAQs, and routes hot leads to your team. Clinics and service businesses see meaningfully more booked appointments.\n\nOpen to a short demo?\n\n" + SIGNOFF_EN,
        delayDaysMin: 2,
        delayDaysMax: 3,
        stopOnReply: true,
      },
      {
        subject: "{Closing the loop|Last one}",
        body: "Hi {{first_name}},\n\nIf faster follow-up isn't on the radar right now, all good — just say the word.\n\nOtherwise I'll send a quick demo tailored to {{company}}.\n\n" + SIGNOFF_EN,
        delayDaysMin: 3,
        delayDaysMax: 4,
        stopOnReply: true,
      },
    ],
  },
  {
    id: "followup-ro",
    offer: "AI Follow-Up Engine",
    language: "ro",
    name: "Motor de follow-up AI (RO)",
    description: "Pentru afaceri cu inbound mult care pierd lead-uri din răspuns lent — pornește cu un demo de AI Receptionist.",
    defaultDailyLimit: 30,
    steps: [
      {
        subject: "{Ce se întâmplă în primele 5 minute|Răspuns lent} la {{company}}?",
        body: "Salut {{first_name}},\n\n{{first_line}}\n\n{{observation}}\n\nMulte afaceri pierd lead-uri pur și simplu pentru că nimeni nu răspunde destul de repede. Configurăm un motor de follow-up AI care califică și programează lead-urile 24/7. Vrei un demo de 2 minute pe fluxul vostru?\n\n" + SIGNOFF_RO,
        delayDaysMin: 0,
        delayDaysMax: 0,
        stopOnReply: true,
      },
      {
        subject: "Re: niciun lead inbound pierdut",
        body: "Salut {{first_name}},\n\nRevin scurt — recepționerul AI răspunde instant, acoperă întrebările frecvente și trimite lead-urile fierbinți la echipă. Clinicile și firmele de servicii văd vizibil mai multe programări.\n\nDeschis la un demo scurt?\n\n" + SIGNOFF_RO,
        delayDaysMin: 2,
        delayDaysMax: 3,
        stopOnReply: true,
      },
      {
        subject: "{Închid subiectul|Ultimul mesaj}",
        body: "Salut {{first_name}},\n\nDacă follow-up-ul rapid nu e pe radar acum, e ok — spune-mi.\n\nAltfel îți trimit un demo scurt adaptat pentru {{company}}.\n\n" + SIGNOFF_RO,
        delayDaysMin: 3,
        delayDaysMax: 4,
        stopOnReply: true,
      },
    ],
  },

  // ───────────────────────── AI SEO Infrastructure ─────────────────────────
  {
    id: "seo-en",
    offer: "AI SEO Infrastructure",
    language: "en",
    name: "SEO opportunity (EN)",
    description: "For businesses with weak organic traffic — opens with a Growth Opportunity Blueprint.",
    defaultDailyLimit: 30,
    steps: [
      {
        subject: "{A few SEO openings for|Inbound ideas for} {{company}}",
        body: "Hi {{first_name}},\n\n{{first_line}}\n\n{{observation}}\n\nI found a few SEO opportunities that could grow {{company}}'s inbound leads over the next few months. We build SEO systems designed for predictable, long-term traffic — not one-off tricks.\n\nWant a short breakdown?\n\n" + SIGNOFF_EN,
        delayDaysMin: 0,
        delayDaysMax: 0,
        stopOnReply: true,
      },
      {
        subject: "Re: the SEO breakdown",
        body: "Hi {{first_name}},\n\nFollowing up — I can put the opportunities into a one-page Growth Opportunity Blueprint: what to fix first and the expected impact.\n\nWorth a look?\n\n" + SIGNOFF_EN,
        delayDaysMin: 2,
        delayDaysMax: 3,
        stopOnReply: true,
      },
      {
        subject: "{Should I close this out?|Last note}",
        body: "Hi {{first_name}},\n\nNo worries if organic growth isn't the focus right now — just let me know and I'll stop here.\n\nOtherwise the blueprint is ready when you are.\n\n" + SIGNOFF_EN,
        delayDaysMin: 3,
        delayDaysMax: 4,
        stopOnReply: true,
      },
    ],
  },
  {
    id: "seo-ro",
    offer: "AI SEO Infrastructure",
    language: "ro",
    name: "Oportunitate SEO (RO)",
    description: "Pentru afaceri cu trafic organic slab — pornește cu un Growth Opportunity Blueprint.",
    defaultDailyLimit: 30,
    steps: [
      {
        subject: "{Câteva oportunități SEO pentru|Idei de inbound pentru} {{company}}",
        body: "Salut {{first_name}},\n\n{{first_line}}\n\n{{observation}}\n\nAm găsit câteva oportunități SEO care pot crește lead-urile inbound pentru {{company}} în lunile următoare. Construim sisteme SEO pentru trafic predictibil pe termen lung, nu trucuri de moment.\n\nVrei un breakdown scurt?\n\n" + SIGNOFF_RO,
        delayDaysMin: 0,
        delayDaysMax: 0,
        stopOnReply: true,
      },
      {
        subject: "Re: breakdown-ul SEO",
        body: "Salut {{first_name}},\n\nRevin — pot pune oportunitățile într-un Growth Opportunity Blueprint de o pagină: ce reparăm întâi și impactul estimat.\n\nMerită o privire?\n\n" + SIGNOFF_RO,
        delayDaysMin: 2,
        delayDaysMax: 3,
        stopOnReply: true,
      },
      {
        subject: "{Închid subiectul?|Ultimul mesaj}",
        body: "Salut {{first_name}},\n\nNicio problemă dacă creșterea organică nu e focusul acum — spune-mi și mă opresc aici.\n\nAltfel, blueprint-ul e gata când ești tu.\n\n" + SIGNOFF_RO,
        delayDaysMin: 3,
        delayDaysMax: 4,
        stopOnReply: true,
      },
    ],
  },

  // ───────────────────────── Workflow Automation Sprint ─────────────────────────
  {
    id: "workflow-en",
    offer: "Workflow Automation Sprint",
    language: "en",
    name: "Automation sprint (EN)",
    description: "For teams drowning in manual admin — opens with an Automation Opportunity Map.",
    defaultDailyLimit: 30,
    steps: [
      {
        subject: "{Quick question on|Manual work at} {{company}}",
        body: "Hi {{first_name}},\n\n{{first_line}}\n\n{{observation}}\n\nQuick question: how much time does your team lose every week on repetitive admin? We run focused automation sprints that remove one painful workflow at a time — onboarding, reporting, handoffs.\n\nWant a few ideas tailored to your stack?\n\n" + SIGNOFF_EN,
        delayDaysMin: 0,
        delayDaysMax: 0,
        stopOnReply: true,
      },
      {
        subject: "Re: 10+ hours/week back",
        body: "Hi {{first_name}},\n\nFollowing up — I can map the one workflow at {{company}} that's costing the most manual hours and how we'd automate it in a single sprint.\n\nOpen to an Automation Opportunity Map?\n\n" + SIGNOFF_EN,
        delayDaysMin: 2,
        delayDaysMax: 3,
        stopOnReply: true,
      },
      {
        subject: "{Closing the loop|Last one}",
        body: "Hi {{first_name}},\n\nIf process automation isn't a priority right now, no problem — just let me know.\n\nOtherwise I'll send the map over.\n\n" + SIGNOFF_EN,
        delayDaysMin: 3,
        delayDaysMax: 4,
        stopOnReply: true,
      },
    ],
  },
  {
    id: "workflow-ro",
    offer: "Workflow Automation Sprint",
    language: "ro",
    name: "Sprint de automatizare (RO)",
    description: "Pentru echipe înecate în admin manual — pornește cu o Automation Opportunity Map.",
    defaultDailyLimit: 30,
    steps: [
      {
        subject: "{O întrebare scurtă despre|Muncă manuală la} {{company}}",
        body: "Salut {{first_name}},\n\n{{first_line}}\n\n{{observation}}\n\nO întrebare scurtă: cât timp pierde echipa în fiecare săptămână pe admin repetitiv? Facem sprinturi de automatizare care elimină câte un workflow dureros — onboarding, raportare, handoff-uri.\n\nVrei câteva idei adaptate la stack-ul vostru?\n\n" + SIGNOFF_RO,
        delayDaysMin: 0,
        delayDaysMax: 0,
        stopOnReply: true,
      },
      {
        subject: "Re: 10+ ore/săptămână recuperate",
        body: "Salut {{first_name}},\n\nRevin — pot mapa workflow-ul de la {{company}} care costă cele mai multe ore manuale și cum l-am automatiza într-un singur sprint.\n\nDeschis la o Automation Opportunity Map?\n\n" + SIGNOFF_RO,
        delayDaysMin: 2,
        delayDaysMax: 3,
        stopOnReply: true,
      },
      {
        subject: "{Închid subiectul|Ultimul mesaj}",
        body: "Salut {{first_name}},\n\nDacă automatizarea proceselor nu e o prioritate acum, nicio problemă — spune-mi.\n\nAltfel îți trimit harta.\n\n" + SIGNOFF_RO,
        delayDaysMin: 3,
        delayDaysMax: 4,
        stopOnReply: true,
      },
    ],
  },

  // ───────────────────────── AI SDR Infrastructure ─────────────────────────
  {
    id: "sdr-en",
    offer: "AI SDR Infrastructure",
    language: "en",
    name: "Outbound infrastructure (EN)",
    description: "For teams that want predictable outbound — opens with a Custom Outbound Blueprint.",
    defaultDailyLimit: 30,
    steps: [
      {
        subject: "{Predictable outbound for|Pipeline idea for} {{company}}",
        body: "Hi {{first_name}},\n\n{{first_line}}\n\n{{observation}}\n\nWe build the outbound infrastructure — domains, warmed inboxes, AI personalization, reply handling — so qualified meetings land on your calendar predictably.\n\nWant a Custom Outbound Blueprint for {{company}}?\n\n" + SIGNOFF_EN,
        delayDaysMin: 0,
        delayDaysMax: 0,
        stopOnReply: true,
      },
      {
        subject: "Re: the outbound blueprint",
        body: "Hi {{first_name}},\n\nFollowing up — the blueprint covers your ICP, the infrastructure to reach them safely, and the personalization that gets replies.\n\nWorth 15 minutes?\n\n" + SIGNOFF_EN,
        delayDaysMin: 2,
        delayDaysMax: 3,
        stopOnReply: true,
      },
      {
        subject: "{Should I close this out?|Last note}",
        body: "Hi {{first_name}},\n\nIf scaling outbound isn't the priority right now, no problem — just let me know and I'll close the loop.\n\nOtherwise the blueprint is ready.\n\n" + SIGNOFF_EN,
        delayDaysMin: 3,
        delayDaysMax: 4,
        stopOnReply: true,
      },
    ],
  },
  {
    id: "sdr-ro",
    offer: "AI SDR Infrastructure",
    language: "ro",
    name: "Infrastructură outbound (RO)",
    description: "Pentru echipe care vor outbound predictibil — pornește cu un Custom Outbound Blueprint.",
    defaultDailyLimit: 30,
    steps: [
      {
        subject: "{Outbound predictibil pentru|O idee de pipeline pentru} {{company}}",
        body: "Salut {{first_name}},\n\n{{first_line}}\n\n{{observation}}\n\nConstruim infrastructura de outbound — domenii, inbox-uri încălzite, personalizare AI, gestionarea răspunsurilor — ca să-ți aterizeze predictibil întâlniri calificate în calendar.\n\nVrei un Custom Outbound Blueprint pentru {{company}}?\n\n" + SIGNOFF_RO,
        delayDaysMin: 0,
        delayDaysMax: 0,
        stopOnReply: true,
      },
      {
        subject: "Re: blueprint-ul de outbound",
        body: "Salut {{first_name}},\n\nRevin — blueprint-ul acoperă ICP-ul vostru, infrastructura ca să-i atingem în siguranță și personalizarea care aduce răspunsuri.\n\nMerită 15 minute?\n\n" + SIGNOFF_RO,
        delayDaysMin: 2,
        delayDaysMax: 3,
        stopOnReply: true,
      },
      {
        subject: "{Închid subiectul?|Ultimul mesaj}",
        body: "Salut {{first_name}},\n\nDacă scalarea outbound-ului nu e prioritatea acum, nicio problemă — spune-mi și închid subiectul.\n\nAltfel, blueprint-ul e gata.\n\n" + SIGNOFF_RO,
        delayDaysMin: 3,
        delayDaysMax: 4,
        stopOnReply: true,
      },
    ],
  },
];

export function getCampaignTemplate(id: string) {
  return CAMPAIGN_TEMPLATES.find((template) => template.id === id);
}
