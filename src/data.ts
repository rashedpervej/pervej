const defaultHeaderImage = "/Rashed Header Image.webp";
const brandHeaderImage = "/brand-header.webp";
const packagingHeaderImage = "/packeging-header.webp";
const motionHeaderImage = "/motion-header.webp";
const mentorHeaderImage = "/mentor-header.webp";
import { DEFAULT_BRAND_SVGS } from "./utils/brandLogos";

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
  brandName?: string;
  logoUrl?: string;
  logoText?: string;
  market?: string;
  country?: string;
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

export interface PersonalInfo {
  name?: string;
  role?: string;
  headline?: string;
  location?: string;
  heroLocation?: string;
  contactLocation?: string;
  availability?: string;
  experienceYears?: string;
  yearsLabel?: string;
  selectedBrandsCount?: string;
  brandsLabel?: string;
  creativeAssetsCount?: string;
  assetsLabel?: string;
  heroBio?: string;
  primaryCtaText?: string;
  primaryCtaLink?: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  portraitImage?: string;
  heroImage?: string;
  avatar?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  behance?: string;
  aboutSummary?: string;
  aboutDetail?: string;
  [key: string]: any;
}

export interface PortfolioData {
  personalInfo: PersonalInfo;
  experiences: Experience[];
  selectedBrands: Brand[];
  skills: {
    creativeTools: Array<{ name: string; percentage?: number; icon?: string; logoUrl?: string; color?: string; category?: string; level?: string | number }>;
    coreCompetencies: string[];
    aiAndModernWorkflow?: string[];
  };
  services: Service[];
  projects: Project[];
  testimonials: Array<{ quote: string; author: string; company: string; role: string; id?: string }>;
  educationCertifications?: any[];
}

export const portfolioData: PortfolioData = {
  personalInfo: {
    name: "Rashed<div><span style=\"color: rgb(212, 123, 255);\">Pervej</span></div>",
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
    heroBio: "Senior Visualizer with <span style=\"color: rgb(193, 141, 236);\"><b>6+ years of premium experience.</b></span> Specialize in high-impact brand identities, modern motion graphics, and tactical food supplement packaging.",
    primaryCtaText: "Explore My Work",
    primaryCtaLink: "https://www.behance.net/rashedpervej",
    secondaryCtaText: "Get In Touch",
    secondaryCtaLink: "https://wa.me/8801932623969",
    portraitImage: "https://ngeaqabzlerwjxvcyucd.supabase.co/storage/v1/object/public/portfolio-assets/portfolio/9otfdzb767s-1784670718085.jpeg",
    email: "rashedpervej2011@gmail.com",
    phone: "+8801932623969",
    linkedin: "linkedin.com/in/rpervej",
    behance: "be.net/rashedpervej",
    aboutSummary: `Senior Visualizer & Graphic Designer with 6+ years of experience across Chaldal Ltd., Sheba Platform Ltd., Go Nature BD, and international clients. I specialize in branding, visual identity, digital marketing, motion graphics, and AI-assisted design, creating impactful visuals that align with business goals.`,
    aboutDetail: `From concept to execution, I transform ideas into cohesive brand experiences through strategic thinking, creative leadership, and modern design systems that drive engagement and business growth.`
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
      { name: "Adobe Illustrator", level: 90 },
      { name: "Adobe After Effects", level: 85 },
      { name: "Canva", level: 84 },
      { name: "CapCut", level: 83 },
      { name: "WordPress", level: 75 },
      { name: "AI-Assisted Design", level: 90 }
    ]
  },
  selectedBrands: [
    { brandName: "Chaldal", name: "Chaldal", country: "Bangladesh", market: "Bangladesh", logoUrl: DEFAULT_BRAND_SVGS["chaldal"] },
    { brandName: "Sheba", name: "Sheba", country: "Bangladesh", market: "Bangladesh", logoUrl: DEFAULT_BRAND_SVGS["sheba"] },
    { brandName: "Go Nature", name: "Go Nature", country: "Bangladesh", market: "Bangladesh", logoUrl: DEFAULT_BRAND_SVGS["go nature"] },
    { brandName: "Basumati Group", name: "Basumati Group", country: "Bangladesh", market: "Bangladesh", logoUrl: DEFAULT_BRAND_SVGS["basumati group"] },
    { brandName: "Heavens Group", name: "Heavens Group", country: "Bangladesh", market: "Bangladesh", logoUrl: DEFAULT_BRAND_SVGS["heavens group"] },
    { brandName: "Zettabyte Technology", name: "Zettabyte Technology", country: "Bangladesh", market: "Bangladesh", logoUrl: DEFAULT_BRAND_SVGS["zettabyte technology"] },
    { brandName: "Amiras Dental", name: "Amiras Dental", country: "Bangladesh", market: "Bangladesh", logoUrl: DEFAULT_BRAND_SVGS["amiras dental"] },
    { brandName: "Dream Advice", name: "Dream Advice", country: "Belgium", market: "Belgium", logoUrl: DEFAULT_BRAND_SVGS["dream advice"] },
    { brandName: "Lake Powell Promotions", name: "Lake Powell Promotions", country: "USA", market: "USA", logoUrl: DEFAULT_BRAND_SVGS["lake powell promotions"] },
    { brandName: "Page Party Bounce Co.", name: "Page Party Bounce Co.", country: "USA", market: "USA", logoUrl: DEFAULT_BRAND_SVGS["page party bounce co."] },
    { brandName: "Food Collection", name: "Food Collection", country: "Bangladesh", market: "Bangladesh", logoUrl: DEFAULT_BRAND_SVGS["food collection"] }
  ] as Brand[],
  services: [
    {
      title: "Brand Identity Design",
      description: "Crafting comprehensive and high-impact visual identities. We design logos, choose brand typography, build color palettes, and compile solid brand guideline books that help companies stand out.",
      skills: ["Logo Design", "Styleguides", "Brand Books", "Stationery"],
      image: "https://ngeaqabzlerwjxvcyucd.supabase.co/storage/v1/object/public/portfolio-assets/portfolio/cropped-5efdld4vbb9-1785164120876.webp"
    },
    {
      title: "Premium Packaging & Print",
      description: "Designing end-to-end tactile experiences. Delivering print-ready, high-resolution visual layouts for food supplements, consumer healthcare products, and retail merchandise.",
      skills: ["Label Design", "Dielines", "3D Visualization", "Pre-press Coordination"],
      image: "https://ngeaqabzlerwjxvcyucd.supabase.co/storage/v1/object/public/portfolio-assets/portfolio/cropped-mswf1womxv-1785164137532.webp"
    },
    {
      title: "Motion Graphics & Promo Videos",
      description: "Bringing static concepts to life with professional video storytelling. High-energy advertisements, short-form Reels, explainer videos, and interactive social content.",
      skills: ["After Effects", "Short-form Editing", "Explainer Videos", "Visual Effects"],
      image: "https://ngeaqabzlerwjxvcyucd.supabase.co/storage/v1/object/public/portfolio-assets/portfolio/cropped-iitb5ce50jc-1785164149396.webp"
    },
    {
      title: "Creative Direction & Design Ops",
      description: "Leading creative teams from project ideation to flawless execution. Ensuring supreme production quality, optimized workflows, and complete consistency across channels.",
      skills: ["Team Mentoring", "Design Strategy", "Client Relations", "Workflow Optimization"],
      image: "https://ngeaqabzlerwjxvcyucd.supabase.co/storage/v1/object/public/portfolio-assets/portfolio/cropped-84vw60t6ze3-1785164161637.webp"
    }
  ] as Service[],
  projects: [
    {
      id: "item-gqg9f7i1ah",
      title: "Go Nature Wellness Brand Identity",
      category: "Brand Design",
      description: "Designed premium packaging and a cohesive visual identity for a healthcare supplement brand.",
      tags: [],
      image: "https://ngeaqabzlerwjxvcyucd.supabase.co/storage/v1/object/public/portfolio-assets/portfolio/vez8xyzttak-1785168598864.webp",
      year: "2025",
      serviceProvided: "Packaging & Brand Design",
      liveUrl: "",
      behanceUrl: "",
      clientName: "",
      toolsUsed: "",
      awardBadge: "",
      projectDuration: "",
      link: ""
    },
    {
      id: "item-urufsli1ui",
      title: "Chaldal Grocery & Campaigns",
      category: "Brand Design",
      description: "Created digital campaigns, promotional assets, and marketing visuals for Bangladesh's leading online grocery platform.",
      tags: [],
      image: "https://ngeaqabzlerwjxvcyucd.supabase.co/storage/v1/object/public/portfolio-assets/portfolio/80qkqrefeuw-1785168646345.webp",
      year: "2023",
      serviceProvided: "Digital Marketing & Campaigns",
      liveUrl: "",
      behanceUrl: "",
      clientName: "",
      toolsUsed: "",
      awardBadge: "",
      projectDuration: "",
      link: ""
    },
    {
      id: "item-fasqb7amxxm",
      title: "Sheba Platform Digital Identity System",
      category: "Branding & Print",
      description: "Produced brand assets, motion graphics, and digital visuals for FinTech and consumer services.",
      tags: [],
      image: "https://ngeaqabzlerwjxvcyucd.supabase.co/storage/v1/object/public/portfolio-assets/portfolio/vbrvmzre33-1785168503669.png",
      year: "2024",
      serviceProvided: "Social Media & Motions",
      liveUrl: "",
      behanceUrl: "",
      clientName: "",
      toolsUsed: "",
      awardBadge: "",
      projectDuration: "",
      link: ""
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
