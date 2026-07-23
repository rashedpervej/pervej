export interface Project {
  id: string;
  title: string;
  category: string;
  description: string;
  tags: string[];
  image: string;
  link?: string;
  year: string;
  clientName?: string;
  serviceProvided?: string;
  toolsUsed?: string;
  projectDuration?: string;
  liveUrl?: string;
  behanceUrl?: string;
  awardBadge?: string;
}

export interface Experience {
  role: string;
  company: string;
  location: string;
  period: string;
  description: string[];
  type?: string;
}

export interface Brand {
  name: string;
  logoText: string;
  market?: string;
}

export interface Service {
  title: string;
  description: string;
  skills: string[];
  image?: string;
}

export interface SkillCategory {
  title: string;
  skills: string[];
}

export const portfolioData = {
  personalInfo: {
    name: "Rashed Pervej",
    role: "Senior Visualizer",
    headline: "Brand Identity | Motion Graphics | Packaging",
    location: "Jashore, Bangladesh",
    availability: "Available for Remote & Hybrid",
    experienceYears: "6+",
    yearsLabel: "Years Experience",
    selectedBrandsCount: "11+",
    brandsLabel: "Selected Brands",
    creativeAssetsCount: "200+",
    assetsLabel: "Creative Assets",
    heroBio: "Senior Visualizer with 6+ years of premium experience. Specialize in high-impact brand identities, modern motion graphics, and tactical food supplement packaging.",
    primaryCtaText: "Explore My Work",
    primaryCtaLink: "#projects",
    secondaryCtaText: "Get In Touch",
    secondaryCtaLink: "#contact",
    portraitImage: "https://i.ibb.co.com/Hf2cC3WR/Generated-Image-September-05-2025-12-33-AM-1.jpg",
    email: "rashedpervej2011@gmail.com",
    phone: "+8801932623969",
    linkedin: "linkedin.com/in/rpervej",
    behance: "be.net/rashedpervej",
    aboutSummary: `Senior Visualizer and Graphic Designer with 6+ years of experience, including creative roles at Chaldal Ltd., Sheba Platform Ltd., and Go Nature BD. I specialize in branding, visual identity, digital marketing, motion graphics, and AI-assisted design, delivering creative solutions for leading organizations and international clients across diverse industries.`,
    aboutDetail: `Beyond creating visuals, I lead creative projects from concept to execution, collaborate with cross-functional teams, and transform business goals into impactful brand experiences. My work focuses on combining strategic thinking with strong visual communication to build consistent brands, engage audiences, and support measurable business growth. I am highly proficient in managing design operations, establishing visual brand standards, and mentoring other creative professionals.`
  },
  experiences: [
    {
      role: "Senior Visualizer",
      company: "Go Nature BD",
      location: "Jashore, Bangladesh",
      period: "Feb 2025 – Present",
      type: "Hybrid",
      description: [
        "Led the creative team, managing project ideation, visualization, design reviews, approvals, and end-to-end execution across branding and marketing initiatives.",
        "Established and maintained the company's visual identity, leading packaging design, print-ready artwork, digital marketing assets, and brand consistency across all customer touchpoints.",
        "Directed creative production for social media, motion graphics, short-form videos, and commercial content while collaborating with marketing and management teams.",
        "Leveraged AI-powered creative workflows to accelerate ideation, content production, and overall creative efficiency across multiple projects.",
        "Recruited and mentored designers and video editors while coordinating with printing vendors to ensure premium production quality."
      ]
    },
    {
      role: "Visualizer",
      company: "Sheba Platform Ltd.",
      location: "Jashore, Bangladesh",
      period: "Jan 2024 – Sep 2024",
      type: "Full-Time",
      description: [
        "Led the Jashore creative team, managing daily design operations and maintaining high creative standards.",
        "Designed digital and print marketing assets, including paid ads, motion graphics, promotional videos, and brand collateral.",
        "Delivered creative solutions across ShebaPay, SManager, SBusiness, FinTech, and other business brands while maintaining strict brand consistency.",
        "Collaborated with marketing teams and presented creative concepts to senior leadership, including the CEO.",
        "Maintained brand guidelines and optimized creative workflows for timely project delivery."
      ]
    },
    {
      role: "Visual Graphic Designer",
      company: "Chaldal Ltd.",
      location: "Jashore, Bangladesh",
      period: "Feb 2020 – Oct 2023",
      type: "Full-Time",
      description: [
        "Designed digital and print marketing assets, including social media campaigns, website and app banners, push notifications, email marketing, motion graphics, promotional videos, and print materials.",
        "Developed campaign concepts and marketing creatives that supported product launches, promotional initiatives, and business growth.",
        "Led a team of 3 designers, conducting design reviews, mentoring team members, and maintaining high creative standards.",
        "Collaborated with marketing, product, content, and cross-functional teams to deliver brand-consistent visual communication.",
        "Conducted annual Information Security (InfoSec) awareness training for the design team and employees across five cross-functional departments."
      ]
    },
    {
      role: "Freelance Graphic Designer",
      company: "Self-Employed",
      location: "Remote",
      period: "2022 – Present",
      type: "Contract",
      description: [
        "Delivered branding, logo identity, packaging, social media, and marketing design solutions for clients across Bangladesh, Belgium, the Czech Republic, and the United States.",
        "Collaborated remotely with startups, agencies, and established businesses, translating complex business goals into clean and effective visual communication."
      ]
    },
    {
      role: "Founder & Computer Trainer",
      company: "Rashed IT & Computer Training Center",
      location: "Jashore, Bangladesh",
      period: "2015 – 2019",
      type: "Owner",
      description: [
        "Delivered Basic Trade computer training covering Microsoft Office applications and computer fundamentals.",
        "Mentored learners through practical, hands-on training to develop workplace-ready digital skills."
      ]
    }
  ] as Experience[],
  skills: {
    coreCompetencies: [
      "Brand Identity",
      "Visual Design & Storytelling",
      "Packaging & Print Design",
      "Motion Graphics",
      "Team Leadership",
      "Creative Direction",
      "AI-Assisted Design",
      "UI/UX Visuals"
    ],
    creativeTools: [
      { name: "Adobe Photoshop", level: 95 },
      { name: "Adobe Illustrator", level: 95 },
      { name: "Adobe After Effects", level: 85 },
      { name: "Canva", level: 90 },
      { name: "CapCut", level: 85 },
      { name: "WordPress", level: 75 },
      { name: "AI-Assisted Design", level: 90 }
    ]
  },
  selectedBrands: [
    { name: "Chaldal", logoText: "Chaldal Ltd.", market: "Bangladesh" },
    { name: "Sheba", logoText: "Sheba Platform Ltd.", market: "Bangladesh" },
    { name: "Go Nature", logoText: "Go Nature BD", market: "Bangladesh" },
    { name: "Basumati Group", logoText: "Basumati Group", market: "Bangladesh" },
    { name: "Heavens Group", logoText: "Heavens Group", market: "Bangladesh" },
    { name: "Zettabyte Technology", logoText: "Zettabyte Technology Ltd.", market: "Bangladesh" },
    { name: "Amiras Dental", logoText: "Amiras Dental", market: "Bangladesh" },
    { name: "Dream Advice", logoText: "Dream Advice", market: "Belgium" },
    { name: "Lake Powell Promotions", logoText: "Lake Powell Promotions", market: "USA" },
    { name: "Page Party Bounce Co.", logoText: "Page Party Bounce Co.", market: "USA" },
    { name: "Food Collection", logoText: "Food Collection Ltd.", market: "Bangladesh" }
  ] as Brand[],
  services: [
    {
      title: "Brand Identity Design",
      description: "Crafting comprehensive and high-impact visual identities. We design logos, choose brand typography, build color palettes, and compile solid brand guideline books that help companies stand out.",
      skills: ["Logo Design", "Styleguides", "Brand Books", "Stationery"],
      image: "https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=600&q=80"
    },
    {
      title: "Premium Packaging & Print",
      description: "Designing end-to-end tactile experiences. Delivering print-ready, high-resolution visual layouts for food supplements, consumer healthcare products, and retail merchandise.",
      skills: ["Label Design", "Dielines", "3D Visualization", "Pre-press Coordination"],
      image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=600&q=80"
    },
    {
      title: "Motion Graphics & Promo Videos",
      description: "Bringing static concepts to life with professional video storytelling. High-energy advertisements, short-form Reels, explainer videos, and interactive social content.",
      skills: ["After Effects", "Short-form Editing", "Explainer Videos", "Visual Effects"],
      image: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=600&q=80"
    },
    {
      title: "Creative Direction & Design Ops",
      description: "Leading creative teams from project ideation to flawless execution. Ensuring supreme production quality, optimized workflows, and complete consistency across channels.",
      skills: ["Team Mentoring", "Design Strategy", "Client Relations", "Workflow Optimization"],
      image: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=600&q=80"
    }
  ] as Service[],
  projects: [
    {
      id: "proj-1",
      title: "Go Nature Wellness Brand Identity",
      category: "Branding & Packaging",
      description: "Led the visual direction, structural packaging, and labeling design for Go Nature's premium healthcare food supplements. Established a harmonious clean brand guidelines system emphasizing purity and natural energy.",
      tags: ["Brand Book", "Packaging Design", "Creative Direction", "3D Mockup"],
      image: "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?auto=format&fit=crop&q=80&w=800",
      year: "2025",
      serviceProvided: "Packaging & Brand Design"
    },
    {
      id: "proj-2",
      title: "Chaldal Grocery Rebrand & Ad Campaigns",
      category: "Digital Marketing & Print",
      description: "Created comprehensive digital assets, push notifications, and dynamic promotional videos that directly supported multi-channel marketing campaigns. Mentored junior designers to maintain pristine standards.",
      tags: ["Motion Graphics", "Social Ads", "Banners", "UI Graphics"],
      image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800",
      year: "2022",
      serviceProvided: "Digital Marketing & Campaigns"
    },
    {
      id: "proj-3",
      title: "Sheba Platform Digital Identity System",
      category: "Motion Graphics",
      description: "Produced highly engaging promotional video motion graphics and brand collaterals for FinTech and consumer-centric platforms, facilitating strategic messaging across five divisions.",
      tags: ["After Effects", "FinTech Branding", "Campaign Assets", "Short-Form Video"],
      image: "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&q=80&w=800",
      year: "2024",
      serviceProvided: "Motion Graphic Production"
    },
    {
      id: "proj-4",
      title: "Dream Advice Belgium Brand Identity",
      category: "International Branding",
      description: "Delivered a corporate branding package including a minimalist logo, premium typeface pairing, and cohesive executive presentation systems for an international advisory startup.",
      tags: ["Logo Design", "Typography", "Styleguides", "Remote Collab"],
      image: "https://images.unsplash.com/photo-1600132806370-bf17e65e942f?auto=format&fit=crop&q=80&w=800",
      year: "2023",
      serviceProvided: "Corporate Brand Identity"
    },
    {
      id: "proj-5",
      title: "Lake Powell Promotions Campaign Assets",
      category: "Branding & Print",
      description: "Crafted striking, modern layout designs and brand collateral packages for promotional agencies in the United States, utilizing highly structured layout theories and custom graphics.",
      tags: ["Marketing Collateral", "Vector Illustration", "Print Layouts", "US Client"],
      image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=800",
      year: "2023",
      serviceProvided: "Print Campaign Assets"
    },
    {
      id: "proj-6",
      title: "Amiras Dental Visual Storytelling",
      category: "Logo & Packaging",
      description: "Designed a clean, clinical yet warm corporate visual system including dental packaging, brochures, and dynamic display graphics ensuring maximum patient reassurance and brand recognition.",
      tags: ["Medical Branding", "Packaging Design", "Vector Art", "Stationery"],
      image: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=800",
      year: "2024",
      serviceProvided: "Logo & Packaging Design"
    }
  ] as Project[],
  testimonials: [
    {
      quote: "Rashed is an exceptional creative force. His ability to lead a design team while keeping up immaculate, print-ready packaging layouts and outstanding video motion graphics elevated our products significantly.",
      author: "Creative Director",
      company: "Go Nature BD",
      role: "Strategic Partner"
    },
    {
      quote: "Working with Rashed during his years at Chaldal was a masterclass in collaboration. He is detail-oriented, highly skilled with Adobe Suite, and has an innate sense of aesthetic balance and visual storytelling.",
      author: "Marketing Manager",
      company: "Chaldal Ltd.",
      role: "Campaign Lead"
    },
    {
      quote: "He handled our international brand elements with incredible professionalism. Despite being remote, communication was crystal clear, and the assets exceeded our expectations.",
      author: "Founder",
      company: "Dream Advice (Belgium)",
      role: "Client"
    }
  ],
  educationCertifications: [
    {
      title: "BSS in Economics",
      institution: "National University, Bangladesh",
      period: "2013 – 2017"
    },
    {
      title: "Foundations of User Experience (UX) Design",
      institution: "Coursera | Google",
      period: "2023"
    },
    {
      title: "Color for Design and Art",
      institution: "Coursera | California Institute of the Arts",
      period: "2022"
    },
    {
      title: "Digital Marketing Certification",
      institution: "LEDP, Government of Bangladesh",
      period: "2020"
    }
  ]
};
