/**
 * Complete Local Fallback Dataset
 * Generated from live Supabase DB content to guarantee 100% offline resilience,
 * zero layout shift, and instant rendering even if the database is unreachable.
 * 
 * DB is the PRIMARY source; this dataset acts as the RELIABLE FALLBACK.
 */

import { SectionRecord, SiteSettings } from "../context/PortfolioContext";
import { DEFAULT_BRAND_SVGS } from "../utils/brandLogos";

export interface FaqFallbackItem {
  id: string;
  question: string;
  shortTitle?: string;
  answer: string;
  keywords: string[];
  category: string;
  status: "published" | "draft";
}

export const FALLBACK_SECTIONS: SectionRecord[] = [
  {
    "id": "a8fa8560-bb9b-42f9-b73e-cf0b3b13a7eb",
    "key": "hero",
    "name": "Hero Section",
    "type": "single",
    "fields_schema": [
      {
        "name": "name",
        "type": "text"
      },
      {
        "name": "role",
        "type": "text"
      },
      {
        "name": "headline",
        "type": "text"
      },
      {
        "name": "availability",
        "type": "text"
      },
      {
        "name": "experienceYears",
        "type": "text"
      }
    ],
    "published_content": {
      "name": "Rashed<div><span style=\"color: rgb(212, 123, 255);\">Pervej</span></div>",
      "role": "Senior Visualizer",
      "heroBio": "Senior Visualizer with <span style=\"color: rgb(193, 141, 236);\"><b>6+ years of premium experience.</b></span> Specialize in high-impact brand identities, modern motion graphics, and tactical food supplement packaging.",
      "headline": "Brand Identity | Motion Graphics | Packaging",
      "availability": "Available for Remote & Hybrid",
      "portraitImage": "/Rashed Header Image.webp",
      "primaryCtaLink": "https://www.behance.net/rashedpervej",
      "primaryCtaText": "Explore My Work",
      "experienceYears": "6+",
      "secondaryCtaLink": "https://wa.me/8801932623969",
      "secondaryCtaText": "Get In Touch"
    },
    "draft_content": {
      "name": "Rashed<div><span style=\"color: rgb(212, 123, 255);\">Pervej</span></div>",
      "role": "Senior Visualizer",
      "heroBio": "Senior Visualizer with <span style=\"color: rgb(193, 141, 236);\"><b>6+ years of premium experience.</b></span> Specialize in high-impact brand identities, modern motion graphics, and tactical food supplement packaging.",
      "headline": "Brand Identity | Motion Graphics | Packaging",
      "availability": "Available for Remote & Hybrid",
      "portraitImage": "/Rashed Header Image.webp",
      "primaryCtaLink": "https://www.behance.net/rashedpervej",
      "primaryCtaText": "Explore My Work",
      "experienceYears": "6+",
      "secondaryCtaLink": "https://wa.me/8801932623969",
      "secondaryCtaText": "Get In Touch"
    },
    "is_visible": true,
    "order_index": 0
  },
  {
    "id": "fff062d2-1ced-495f-a8a4-03e1d5419d5c",
    "key": "about",
    "name": "About Section",
    "type": "single",
    "fields_schema": [
      {
        "name": "aboutSummary",
        "type": "textarea"
      },
      {
        "name": "aboutDetail",
        "type": "textarea"
      }
    ],
    "published_content": {
      "aboutDetail": "From concept to execution, I transform ideas into cohesive brand experiences through strategic thinking, creative leadership, and modern design systems that drive engagement and business growth.",
      "aboutSummary": "Senior Visualizer & Graphic Designer with 6+ years of experience across Chaldal Ltd., Sheba Platform Ltd., Go Nature BD, and international clients. I specialize in branding, visual identity, digital marketing, motion graphics, and AI-assisted design, creating impactful visuals that align with business goals.",
      "highlights": [
        { "id": "highlight-1", "title": "6+ Years Design Ops", "icon": "award", "isVisible": true },
        { "id": "highlight-2", "title": "Security Minded", "icon": "shield", "isVisible": true },
        { "id": "highlight-3", "title": "Print-Ready Precision", "icon": "file-check", "isVisible": true }
      ]
    },
    "draft_content": {
      "aboutDetail": "From concept to execution, I transform ideas into cohesive brand experiences through strategic thinking, creative leadership, and modern design systems that drive engagement and business growth.",
      "aboutSummary": "Senior Visualizer & Graphic Designer with 6+ years of experience across Chaldal Ltd., Sheba Platform Ltd., Go Nature BD, and international clients. I specialize in branding, visual identity, digital marketing, motion graphics, and AI-assisted design, creating impactful visuals that align with business goals.",
      "highlights": [
        { "id": "highlight-1", "title": "6+ Years Design Ops", "icon": "award", "isVisible": true },
        { "id": "highlight-2", "title": "Security Minded", "icon": "shield", "isVisible": true },
        { "id": "highlight-3", "title": "Print-Ready Precision", "icon": "file-check", "isVisible": true }
      ]
    },
    "is_visible": true,
    "order_index": 1
  },
  {
    "id": "b3e9401f-ed52-44f2-95f3-5e72d244c9aa",
    "key": "educationCertifications",
    "name": "Education & Certifications",
    "type": "collection",
    "fields_schema": [
      {
        "name": "title",
        "type": "text"
      },
      {
        "name": "institution",
        "type": "text"
      },
      {
        "name": "period",
        "type": "text"
      },
      {
        "name": "credentialUrl",
        "type": "text"
      }
    ],
    "published_content": [
      {
        "title": "BSS in Economics",
        "institution": "National University, Bangladesh",
        "period": "2013 – 2017"
      },
      {
        "title": "Foundations of User Experience (UX) Design",
        "institution": "Coursera | Google",
        "period": "2023"
      },
      {
        "title": "Color for Design and Art",
        "institution": "Coursera | California Institute of the Arts",
        "period": "2022"
      },
      {
        "title": "Digital Marketing Certification",
        "institution": "LEDP, Government of Bangladesh",
        "period": "2020"
      }
    ],
    "draft_content": [
      {
        "title": "BSS in Economics",
        "institution": "National University, Bangladesh",
        "period": "2013 – 2017"
      },
      {
        "title": "Foundations of User Experience (UX) Design",
        "institution": "Coursera | Google",
        "period": "2023"
      },
      {
        "title": "Color for Design and Art",
        "institution": "Coursera | California Institute of the Arts",
        "period": "2022"
      },
      {
        "title": "Digital Marketing Certification",
        "institution": "LEDP, Government of Bangladesh",
        "period": "2020"
      }
    ],
    "is_visible": true,
    "order_index": 2
  },
  {
    "id": "e00bce95-c8e9-4cb4-93b3-09d3fd50e148",
    "key": "experience",
    "name": "Experience Section",
    "type": "collection",
    "fields_schema": [
      {
        "name": "role",
        "type": "text"
      },
      {
        "name": "company",
        "type": "text"
      },
      {
        "name": "location",
        "type": "text"
      },
      {
        "name": "period",
        "type": "text"
      },
      {
        "name": "type",
        "type": "text"
      },
      {
        "name": "description",
        "type": "list"
      }
    ],
    "published_content": [
      {
        "role": "Senior Visualizer",
        "type": "Hybrid",
        "period": "Feb 2025 – Present",
        "company": "Go Nature BD",
        "location": "Jashore, Bangladesh",
        "description": [
          "Led the creative team, managing project ideation, visualization, design reviews, approvals, and end-to-end execution across branding and marketing initiatives.",
          "Established and maintained the company's visual identity, leading packaging design, print-ready artwork, digital marketing assets, and brand consistency across all customer touchpoints.",
          "Directed creative production for social media, motion graphics, short-form videos, and commercial content while collaborating with marketing and management teams.",
          "Leveraged AI-powered creative workflows to accelerate ideation, content production, and overall creative efficiency across multiple projects.",
          "Recruited and mentored designers and video editors while coordinating with printing vendors to ensure premium production quality."
        ]
      },
      {
        "role": "Visualizer",
        "type": "Full-Time",
        "period": "Jan 2024 – Sep 2024",
        "company": "Sheba Platform Ltd.",
        "location": "Jashore, Bangladesh",
        "description": [
          "Led the Jashore creative team, managing daily design operations and maintaining high creative standards.",
          "Designed digital and print marketing assets, including paid ads, motion graphics, promotional videos, and brand collateral.",
          "Delivered creative solutions across ShebaPay, SManager, SBusiness, FinTech, and other business brands while maintaining strict brand consistency.",
          "Collaborated with marketing teams and presented creative concepts to senior leadership, including the CEO.",
          "Maintained brand guidelines and optimized creative workflows for timely project delivery."
        ]
      },
      {
        "role": "Visual Graphic Designer",
        "type": "Full-Time",
        "period": "Feb 2020 – Oct 2023",
        "company": "Chaldal Ltd.",
        "location": "Jashore, Bangladesh",
        "description": [
          "Designed digital and print marketing assets, including social media campaigns, website and app banners, push notifications, email marketing, motion graphics, promotional videos, and print materials.",
          "Developed campaign concepts and marketing creatives that supported product launches, promotional initiatives, and business growth.",
          "Led a team of 3 designers, conducting design reviews, mentoring team members, and maintaining high creative standards.",
          "Collaborated with marketing, product, content, and cross-functional teams to deliver brand-consistent visual communication.",
          "Conducted annual Information Security (InfoSec) awareness training for the design team and employees across five cross-functional departments."
        ]
      },
      {
        "role": "Freelance Graphic Designer",
        "type": "Contract",
        "period": "2022 – Present",
        "company": "Self-Employed",
        "location": "Remote",
        "description": [
          "Delivered branding, logo identity, packaging, social media, and marketing design solutions for clients across Bangladesh, Belgium, the Czech Republic, and the United States.",
          "Collaborated remotely with startups, agencies, and established businesses, translating complex business goals into clean and effective visual communication."
        ]
      },
      {
        "role": "Founder & Computer Trainer",
        "type": "Owner",
        "period": "2015 – 2019",
        "company": "Rashed IT & Computer Training Center",
        "location": "Jashore, Bangladesh",
        "description": [
          "Delivered Basic Trade computer training covering Microsoft Office applications and computer fundamentals.",
          "Mentored learners through practical, hands-on training to develop workplace-ready digital skills."
        ]
      }
    ],
    "draft_content": [
      {
        "role": "Senior Visualizer",
        "type": "Hybrid",
        "period": "Feb 2025 – Present",
        "company": "Go Nature BD",
        "location": "Jashore, Bangladesh",
        "description": [
          "Led the creative team, managing project ideation, visualization, design reviews, approvals, and end-to-end execution across branding and marketing initiatives.",
          "Established and maintained the company's visual identity, leading packaging design, print-ready artwork, digital marketing assets, and brand consistency across all customer touchpoints.",
          "Directed creative production for social media, motion graphics, short-form videos, and commercial content while collaborating with marketing and management teams.",
          "Leveraged AI-powered creative workflows to accelerate ideation, content production, and overall creative efficiency across multiple projects.",
          "Recruited and mentored designers and video editors while coordinating with printing vendors to ensure premium production quality."
        ]
      },
      {
        "role": "Visualizer",
        "type": "Full-Time",
        "period": "Jan 2024 – Sep 2024",
        "company": "Sheba Platform Ltd.",
        "location": "Jashore, Bangladesh",
        "description": [
          "Led the Jashore creative team, managing daily design operations and maintaining high creative standards.",
          "Designed digital and print marketing assets, including paid ads, motion graphics, promotional videos, and brand collateral.",
          "Delivered creative solutions across ShebaPay, SManager, SBusiness, FinTech, and other business brands while maintaining strict brand consistency.",
          "Collaborated with marketing teams and presented creative concepts to senior leadership, including the CEO.",
          "Maintained brand guidelines and optimized creative workflows for timely project delivery."
        ]
      },
      {
        "role": "Visual Graphic Designer",
        "type": "Full-Time",
        "period": "Feb 2020 – Oct 2023",
        "company": "Chaldal Ltd.",
        "location": "Jashore, Bangladesh",
        "description": [
          "Designed digital and print marketing assets, including social media campaigns, website and app banners, push notifications, email marketing, motion graphics, promotional videos, and print materials.",
          "Developed campaign concepts and marketing creatives that supported product launches, promotional initiatives, and business growth.",
          "Led a team of 3 designers, conducting design reviews, mentoring team members, and maintaining high creative standards.",
          "Collaborated with marketing, product, content, and cross-functional teams to deliver brand-consistent visual communication.",
          "Conducted annual Information Security (InfoSec) awareness training for the design team and employees across five cross-functional departments."
        ]
      },
      {
        "role": "Freelance Graphic Designer",
        "type": "Contract",
        "period": "2022 – Present",
        "company": "Self-Employed",
        "location": "Remote",
        "description": [
          "Delivered branding, logo identity, packaging, social media, and marketing design solutions for clients across Bangladesh, Belgium, the Czech Republic, and the United States.",
          "Collaborated remotely with startups, agencies, and established businesses, translating complex business goals into clean and effective visual communication."
        ]
      },
      {
        "role": "Founder & Computer Trainer",
        "type": "Owner",
        "period": "2015 – 2019",
        "company": "Rashed IT & Computer Training Center",
        "location": "Jashore, Bangladesh",
        "description": [
          "Delivered Basic Trade computer training covering Microsoft Office applications and computer fundamentals.",
          "Mentored learners through practical, hands-on training to develop workplace-ready digital skills."
        ]
      }
    ],
    "is_visible": true,
    "order_index": 2
  },
  {
    "id": "90b6ef88-52c3-4c6e-97c7-c75ae7f63218",
    "key": "skills",
    "name": "Skills Section",
    "type": "single",
    "fields_schema": [
      {
        "name": "coreCompetencies",
        "type": "list"
      },
      {
        "name": "creativeTools",
        "type": "object_list"
      }
    ],
    "published_content": {
      "creativeTools": [
        {
          "name": "Adobe Photoshop",
          "level": 95
        },
        {
          "name": "Adobe Illustrator",
          "level": 90
        },
        {
          "name": "Adobe After Effects",
          "level": 85
        },
        {
          "name": "Canva",
          "level": 84
        },
        {
          "name": "CapCut",
          "level": 83
        },
        {
          "name": "WordPress",
          "level": 75
        },
        {
          "name": "AI-Assisted Design",
          "level": 90
        }
      ],
      "coreCompetencies": [
        "Brand Identity",
        "Visual Design & Storytelling",
        "Packaging & Print Design",
        "Motion Graphics",
        "Team Leadership",
        "Creative Direction",
        "AI-Assisted Design",
        "UI/UX Visuals"
      ]
    },
    "draft_content": {
      "creativeTools": [
        {
          "name": "Adobe Photoshop",
          "level": 95
        },
        {
          "name": "Adobe Illustrator",
          "level": 90
        },
        {
          "name": "Adobe After Effects",
          "level": 85
        },
        {
          "name": "Canva",
          "level": 84
        },
        {
          "name": "CapCut",
          "level": 83
        },
        {
          "name": "WordPress",
          "level": 75
        },
        {
          "name": "AI-Assisted Design",
          "level": 90
        }
      ],
      "coreCompetencies": [
        "Brand Identity",
        "Visual Design & Storytelling",
        "Packaging & Print Design",
        "Motion Graphics",
        "Team Leadership",
        "Creative Direction",
        "AI-Assisted Design",
        "UI/UX Visuals"
      ]
    },
    "is_visible": true,
    "order_index": 3
  },
  {
    "id": "08f33fbc-0046-4df2-b463-0876fe016516",
    "key": "brands",
    "name": "Brands Section",
    "type": "collection",
    "fields_schema": [
      {
        "name": "brandName",
        "type": "text"
      },
      {
        "name": "country",
        "type": "text"
      },
      {
        "name": "logoUrl",
        "type": "image"
      }
    ],
    "published_content": [
      {
        "name": "Chaldal",
        "brandName": "Chaldal",
        "market": "Bangladesh",
        "country": "Bangladesh",
        "logoUrl": DEFAULT_BRAND_SVGS["chaldal"]
      },
      {
        "name": "Sheba",
        "brandName": "Sheba",
        "market": "Bangladesh",
        "country": "Bangladesh",
        "logoUrl": DEFAULT_BRAND_SVGS["sheba"]
      },
      {
        "name": "Go Nature",
        "brandName": "Go Nature",
        "market": "Bangladesh",
        "country": "Bangladesh",
        "logoUrl": DEFAULT_BRAND_SVGS["go nature"]
      },
      {
        "name": "Basumati Group",
        "brandName": "Basumati Group",
        "market": "Bangladesh",
        "country": "Bangladesh",
        "logoUrl": DEFAULT_BRAND_SVGS["basumati group"]
      },
      {
        "name": "Heavens Group",
        "brandName": "Heavens Group",
        "market": "Bangladesh",
        "country": "Bangladesh",
        "logoUrl": DEFAULT_BRAND_SVGS["heavens group"]
      },
      {
        "name": "Zettabyte Technology",
        "brandName": "Zettabyte Technology",
        "market": "Bangladesh",
        "country": "Bangladesh",
        "logoUrl": DEFAULT_BRAND_SVGS["zettabyte technology"]
      },
      {
        "name": "Amiras Dental",
        "brandName": "Amiras Dental",
        "market": "Bangladesh",
        "country": "Bangladesh",
        "logoUrl": DEFAULT_BRAND_SVGS["amiras dental"]
      },
      {
        "name": "Dream Advice",
        "brandName": "Dream Advice",
        "market": "Belgium",
        "country": "Belgium",
        "logoUrl": DEFAULT_BRAND_SVGS["dream advice"]
      },
      {
        "name": "Lake Powell Promotions",
        "brandName": "Lake Powell Promotions",
        "market": "USA",
        "country": "USA",
        "logoUrl": DEFAULT_BRAND_SVGS["lake powell promotions"]
      },
      {
        "name": "Page Party Bounce Co.",
        "brandName": "Page Party Bounce Co.",
        "market": "USA",
        "country": "USA",
        "logoUrl": DEFAULT_BRAND_SVGS["page party bounce co."]
      },
      {
        "name": "Food Collection",
        "brandName": "Food Collection",
        "market": "Bangladesh",
        "country": "Bangladesh",
        "logoUrl": DEFAULT_BRAND_SVGS["food collection"]
      }
    ],
    "draft_content": [
      {
        "name": "Chaldal",
        "brandName": "Chaldal",
        "market": "Bangladesh",
        "country": "Bangladesh",
        "logoUrl": DEFAULT_BRAND_SVGS["chaldal"]
      },
      {
        "name": "Sheba",
        "brandName": "Sheba",
        "market": "Bangladesh",
        "country": "Bangladesh",
        "logoUrl": DEFAULT_BRAND_SVGS["sheba"]
      },
      {
        "name": "Go Nature",
        "brandName": "Go Nature",
        "market": "Bangladesh",
        "country": "Bangladesh",
        "logoUrl": DEFAULT_BRAND_SVGS["go nature"]
      },
      {
        "name": "Basumati Group",
        "brandName": "Basumati Group",
        "market": "Bangladesh",
        "country": "Bangladesh",
        "logoUrl": DEFAULT_BRAND_SVGS["basumati group"]
      },
      {
        "name": "Heavens Group",
        "brandName": "Heavens Group",
        "market": "Bangladesh",
        "country": "Bangladesh",
        "logoUrl": DEFAULT_BRAND_SVGS["heavens group"]
      },
      {
        "name": "Zettabyte Technology",
        "brandName": "Zettabyte Technology",
        "market": "Bangladesh",
        "country": "Bangladesh",
        "logoUrl": DEFAULT_BRAND_SVGS["zettabyte technology"]
      },
      {
        "name": "Amiras Dental",
        "brandName": "Amiras Dental",
        "market": "Bangladesh",
        "country": "Bangladesh",
        "logoUrl": DEFAULT_BRAND_SVGS["amiras dental"]
      },
      {
        "name": "Dream Advice",
        "brandName": "Dream Advice",
        "market": "Belgium",
        "country": "Belgium",
        "logoUrl": DEFAULT_BRAND_SVGS["dream advice"]
      },
      {
        "name": "Lake Powell Promotions",
        "brandName": "Lake Powell Promotions",
        "market": "USA",
        "country": "USA",
        "logoUrl": DEFAULT_BRAND_SVGS["lake powell promotions"]
      },
      {
        "name": "Page Party Bounce Co.",
        "brandName": "Page Party Bounce Co.",
        "market": "USA",
        "country": "USA",
        "logoUrl": DEFAULT_BRAND_SVGS["page party bounce co."]
      },
      {
        "name": "Food Collection",
        "brandName": "Food Collection",
        "market": "Bangladesh",
        "country": "Bangladesh",
        "logoUrl": DEFAULT_BRAND_SVGS["food collection"]
      }
    ],
    "is_visible": true,
    "order_index": 4
  },
  {
    "id": "88ff8a94-d7bf-4cfc-982a-e81514f358b0",
    "key": "services",
    "name": "Services Section",
    "type": "collection",
    "fields_schema": [
      {
        "name": "title",
        "type": "text"
      },
      {
        "name": "description",
        "type": "textarea"
      },
      {
        "name": "skills",
        "type": "list"
      }
    ],
    "published_content": [
      {
        "image": "https://ngeaqabzlerwjxvcyucd.supabase.co/storage/v1/object/public/portfolio-assets/portfolio/cropped-5efdld4vbb9-1785164120876.webp",
        "title": "Brand Identity Design",
        "skills": [
          "Logo Design",
          "Styleguides",
          "Brand Books",
          "Stationery"
        ],
        "description": [
          "Crafting comprehensive and high-impact visual identities. We design logos, choose brand typography, build color palettes, and compile solid brand guideline books that help companies stand out."
        ]
      },
      {
        "image": "https://ngeaqabzlerwjxvcyucd.supabase.co/storage/v1/object/public/portfolio-assets/portfolio/cropped-mswf1womxv-1785164137532.webp",
        "title": "Premium Packaging & Print",
        "skills": [
          "Label Design",
          "Dielines",
          "3D Visualization",
          "Pre-press Coordination"
        ],
        "description": [
          "Designing end-to-end tactile experiences. Delivering print-ready, high-resolution visual layouts for food supplements, consumer healthcare products, and retail merchandise."
        ]
      },
      {
        "image": "https://ngeaqabzlerwjxvcyucd.supabase.co/storage/v1/object/public/portfolio-assets/portfolio/cropped-iitb5ce50jc-1785164149396.webp",
        "title": "Motion Graphics & Promo Videos",
        "skills": [
          "After Effects",
          "Short-form Editing",
          "Explainer Videos",
          "Visual Effects"
        ],
        "description": [
          "Bringing static concepts to life with professional video storytelling. High-energy advertisements, short-form Reels, explainer videos, and interactive social content."
        ]
      },
      {
        "image": "https://ngeaqabzlerwjxvcyucd.supabase.co/storage/v1/object/public/portfolio-assets/portfolio/cropped-84vw60t6ze3-1785164161637.webp",
        "title": "Creative Direction & Design Ops",
        "skills": [
          "Team Mentoring",
          "Design Strategy",
          "Client Relations",
          "Workflow Optimization"
        ],
        "description": [
          "Leading creative teams from project ideation to flawless execution. Ensuring supreme production quality, optimized workflows, and complete consistency across channels."
        ]
      }
    ],
    "draft_content": [
      {
        "image": "https://ngeaqabzlerwjxvcyucd.supabase.co/storage/v1/object/public/portfolio-assets/portfolio/cropped-5efdld4vbb9-1785164120876.webp",
        "title": "Brand Identity Design",
        "skills": [
          "Logo Design",
          "Styleguides",
          "Brand Books",
          "Stationery"
        ],
        "description": [
          "Crafting comprehensive and high-impact visual identities. We design logos, choose brand typography, build color palettes, and compile solid brand guideline books that help companies stand out."
        ]
      },
      {
        "image": "https://ngeaqabzlerwjxvcyucd.supabase.co/storage/v1/object/public/portfolio-assets/portfolio/cropped-mswf1womxv-1785164137532.webp",
        "title": "Premium Packaging & Print",
        "skills": [
          "Label Design",
          "Dielines",
          "3D Visualization",
          "Pre-press Coordination"
        ],
        "description": [
          "Designing end-to-end tactile experiences. Delivering print-ready, high-resolution visual layouts for food supplements, consumer healthcare products, and retail merchandise."
        ]
      },
      {
        "image": "https://ngeaqabzlerwjxvcyucd.supabase.co/storage/v1/object/public/portfolio-assets/portfolio/cropped-iitb5ce50jc-1785164149396.webp",
        "title": "Motion Graphics & Promo Videos",
        "skills": [
          "After Effects",
          "Short-form Editing",
          "Explainer Videos",
          "Visual Effects"
        ],
        "description": [
          "Bringing static concepts to life with professional video storytelling. High-energy advertisements, short-form Reels, explainer videos, and interactive social content."
        ]
      },
      {
        "image": "https://ngeaqabzlerwjxvcyucd.supabase.co/storage/v1/object/public/portfolio-assets/portfolio/cropped-84vw60t6ze3-1785164161637.webp",
        "title": "Creative Direction & Design Ops",
        "skills": [
          "Team Mentoring",
          "Design Strategy",
          "Client Relations",
          "Workflow Optimization"
        ],
        "description": [
          "Leading creative teams from project ideation to flawless execution. Ensuring supreme production quality, optimized workflows, and complete consistency across channels."
        ]
      }
    ],
    "is_visible": true,
    "order_index": 5
  },
  {
    "id": "e9b2abe1-237c-4da7-9bcb-7fc17f0e068f",
    "key": "projects",
    "name": "Projects",
    "type": "collection",
    "fields_schema": [
      {
        "name": "id",
        "type": "text"
      },
      {
        "name": "title",
        "type": "text"
      },
      {
        "name": "category",
        "type": "text"
      },
      {
        "name": "description",
        "type": "textarea"
      },
      {
        "name": "tags",
        "type": "list"
      },
      {
        "name": "image",
        "type": "image"
      },
      {
        "name": "year",
        "type": "text"
      }
    ],
    "published_content": [
      {
        "id": "item-gqg9f7i1ah",
        "link": "",
        "tags": [],
        "year": "2025",
        "image": "/brand-header.webp",
        "title": "Go Nature Wellness Brand Identity",
        "liveUrl": "",
        "category": "Brand Design",
        "toolsUsed": "",
        "awardBadge": "",
        "behanceUrl": "",
        "clientName": "",
        "description": [
          "Designed premium packaging and a cohesive visual identity for a healthcare supplement brand."
        ],
        "projectDuration": "",
        "serviceProvided": "Packaging & Brand Design"
      },
      {
        "id": "item-urufsli1ui",
        "link": "",
        "tags": [],
        "year": "2023",
        "image": "/brand-header.webp",
        "title": "Chaldal Grocery & Campaigns",
        "liveUrl": "",
        "category": "Brand Design",
        "toolsUsed": "",
        "awardBadge": "",
        "behanceUrl": "",
        "clientName": "",
        "description": [
          "Created digital campaigns, promotional assets, and marketing visuals for Bangladesh's leading online grocery platform."
        ],
        "projectDuration": "",
        "serviceProvided": "Digital Marketing & Campaigns"
      },
      {
        "id": "item-fasqb7amxxm",
        "link": "",
        "tags": [],
        "year": "2024",
        "image": "/motion-header.webp",
        "title": "Sheba Platform Digital Identity System",
        "liveUrl": "",
        "category": "Branding & Print",
        "toolsUsed": "",
        "awardBadge": "",
        "behanceUrl": "",
        "clientName": "",
        "description": [
          "Produced brand assets, motion graphics, and digital visuals for FinTech and consumer services."
        ],
        "projectDuration": "",
        "serviceProvided": "Social Media & Motions"
      }
    ],
    "draft_content": [
      {
        "id": "item-gqg9f7i1ah",
        "link": "",
        "tags": [],
        "year": "2025",
        "image": "/brand-header.webp",
        "title": "Go Nature Wellness Brand Identity",
        "liveUrl": "",
        "category": "Brand Design",
        "toolsUsed": "",
        "awardBadge": "",
        "behanceUrl": "",
        "clientName": "",
        "description": [
          "Designed premium packaging and a cohesive visual identity for a healthcare supplement brand."
        ],
        "projectDuration": "",
        "serviceProvided": "Packaging & Brand Design"
      },
      {
        "id": "item-urufsli1ui",
        "link": "",
        "tags": [],
        "year": "2023",
        "image": "/brand-header.webp",
        "title": "Chaldal Grocery & Campaigns",
        "liveUrl": "",
        "category": "Brand Design",
        "toolsUsed": "",
        "awardBadge": "",
        "behanceUrl": "",
        "clientName": "",
        "description": [
          "Created digital campaigns, promotional assets, and marketing visuals for Bangladesh's leading online grocery platform."
        ],
        "projectDuration": "",
        "serviceProvided": "Digital Marketing & Campaigns"
      },
      {
        "id": "item-fasqb7amxxm",
        "link": "",
        "tags": [],
        "year": "2024",
        "image": "/motion-header.webp",
        "title": "Sheba Platform Digital Identity System",
        "liveUrl": "",
        "category": "Branding & Print",
        "toolsUsed": "",
        "awardBadge": "",
        "behanceUrl": "",
        "clientName": "",
        "description": [
          "Produced brand assets, motion graphics, and digital visuals for FinTech and consumer services."
        ],
        "projectDuration": "",
        "serviceProvided": "Social Media & Motions"
      }
    ],
    "is_visible": true,
    "order_index": 6
  },
  {
    "id": "fad4e271-6eb2-4961-9bea-d7fa35651814",
    "key": "testimonials",
    "name": "Testimonials Section",
    "type": "collection",
    "fields_schema": [
      {
        "name": "quote",
        "type": "textarea"
      },
      {
        "name": "author",
        "type": "text"
      },
      {
        "name": "company",
        "type": "text"
      },
      {
        "name": "role",
        "type": "text"
      }
    ],
    "published_content": [
      {
        "role": "Strategic Partner",
        "quote": "Rashed is an exceptional creative force. His ability to lead a design team while keeping up immaculate, print-ready packaging layouts and outstanding video motion graphics elevated our products significantly.",
        "author": "Creative Director",
        "company": "Go Nature BD"
      },
      {
        "role": "Campaign Lead",
        "quote": "Working with Rashed during his years at Chaldal was a masterclass in collaboration. He is detail-oriented, highly skilled with Adobe Suite, and has an innate sense of aesthetic balance and visual storytelling.",
        "author": "Marketing Manager",
        "company": "Chaldal Ltd."
      },
      {
        "role": "Client",
        "quote": "He handled our international brand elements with incredible professionalism. Despite being remote, communication was crystal clear, and the assets exceeded our expectations.",
        "author": "Founder",
        "company": "Dream Advice (Belgium)"
      }
    ],
    "draft_content": [
      {
        "role": "Strategic Partner",
        "quote": "Rashed is an exceptional creative force. His ability to lead a design team while keeping up immaculate, print-ready packaging layouts and outstanding video motion graphics elevated our products significantly.",
        "author": "Creative Director",
        "company": "Go Nature BD"
      },
      {
        "role": "Campaign Lead",
        "quote": "Working with Rashed during his years at Chaldal was a masterclass in collaboration. He is detail-oriented, highly skilled with Adobe Suite, and has an innate sense of aesthetic balance and visual storytelling.",
        "author": "Marketing Manager",
        "company": "Chaldal Ltd."
      },
      {
        "role": "Client",
        "quote": "He handled our international brand elements with incredible professionalism. Despite being remote, communication was crystal clear, and the assets exceeded our expectations.",
        "author": "Founder",
        "company": "Dream Advice (Belgium)"
      }
    ],
    "is_visible": true,
    "order_index": 7
  },
  {
    "id": "17ad89d3-42a1-46d9-b7fa-2ad3e2349ed0",
    "key": "contact",
    "name": "Contact Details Section",
    "type": "single",
    "fields_schema": [
      {
        "name": "email",
        "type": "text"
      },
      {
        "name": "phone",
        "type": "text"
      },
      {
        "name": "location",
        "type": "text"
      },
      {
        "name": "linkedin",
        "type": "text"
      },
      {
        "name": "behance",
        "type": "text"
      }
    ],
    "published_content": {
      "email": "rashedpervej2011@gmail.com",
      "phone": "+8801932623969",
      "behance": "be.net/rashedpervej",
      "linkedin": "linkedin.com/in/rpervej",
      "location": "Jashore, Bangladesh"
    },
    "draft_content": {
      "email": "rashedpervej2011@gmail.com",
      "phone": "+8801932623969",
      "behance": "be.net/rashedpervej",
      "linkedin": "linkedin.com/in/rpervej",
      "location": "Jashore, Bangladesh"
    },
    "is_visible": true,
    "order_index": 9
  }
];

export const FALLBACK_SITE_SETTINGS: SiteSettings = {
  "seoTitle": "Rashed Pervej | Senior Visualizer Portfolio",
  "seoDescription": "Portfolio of Rashed Pervej, Senior Visualizer specializing in Brand Identity, Packaging, and Motion Design.",
  "seoKeywords": "portfolio, designer, visualizer, packaging, branding, motion graphics, bangladesh",
  "ogTitle": "Rashed Pervej | Senior Visualizer Portfolio",
  "ogDescription": "Award-winning portfolio of Rashed Pervej, Senior Visualizer & Graphic Designer specializing in brand identity, packaging, and motion graphics.",
  "ogImage": "/og-image.webp",
  "ogUrl": "",
  "backgroundStyle": "liquid",
  "cvSource": "url",
  "cvUrl": "/Rashed-Pervej-Resume.pdf",
  "cvFileName": "Rashed-Pervej-Resume.pdf",
  "primaryColor": "#a64dff",
  "faviconUrl": "/favicon.svg",
  "customCss": "",
  "enableChatbot": true,
  "marqueeSpeed": 25,
  "projectSettings": {
    "showYear": false,
    "showLiveUrl": false,
    "showCategory": false,
    "showServices": false,
    "showFilterAll": true,
    "showToolsUsed": false,
    "showAwardBadge": false,
    "showBehanceUrl": true,
    "showClientName": false,
    "showProjectTags": true,
    "showFilterMotion": true,
    "showFilterBranding": true,
    "showCaseStudyButton": false,
    "showCategoryFilters": false,
    "showFilterMarketing": true,
    "showProjectDuration": false,
    "showFilterInternational": true
  }
};

export const FALLBACK_FAQS: FaqFallbackItem[] = [
  {
    "id": "faq_role_experience",
    "shortTitle": "Years of Experience & Role",
    "question": "What is your current role and years of experience?",
    "answer": "I am a Senior Visualizer with over 6+ years of dedicated professional design experience (7+ years design journey), currently leading creative brand identity and packaging design at Go Nature BD.",
    "keywords": ["role", "experience", "senior visualizer", "years", "current job", "background"],
    "category": "general",
    "status": "published"
  },
  {
    "id": "faq_pricing_approach",
    "shortTitle": "Pricing & Quotation",
    "question": "How do you calculate pricing for a project?",
    "answer": "I work on custom, project-based pricing tailored to your specific deliverables, complexity, and timeline—no rigid hourly fees. Reach out with a short project brief for an exact quotation.",
    "keywords": ["price", "pricing", "cost", "quote", "budget", "rate", "fee", "how much"],
    "category": "pricing",
    "status": "published"
  },
  {
    "id": "faq_branding_deliverables",
    "shortTitle": "Brand Identity Package",
    "question": "What does a complete brand identity package include?",
    "answer": "A full identity package includes primary and secondary logos, brand guidelines, color system, custom typography pairings, stationery kits, social media templates, and vector source files (AI, EPS, SVG, PDF, PNG).",
    "keywords": ["branding", "identity", "brand package", "logo", "styleguide", "guidelines", "typography"],
    "category": "branding",
    "status": "published"
  },
  {
    "id": "faq_packaging_dieline",
    "shortTitle": "Print-Ready Dielines",
    "question": "Do you provide print-ready dielines for packaging?",
    "answer": "Yes! I deliver 100% factory-ready dieline files in CMYK with exact bleed, crease/cut lines, spot UV layers, and foil stamp specifications compatible with professional print vendors.",
    "keywords": ["packaging", "dieline", "print ready", "cmyk", "label", "box", "bottle", "vendor"],
    "category": "packaging",
    "status": "published"
  },
  {
    "id": "faq_supplement_packaging",
    "shortTitle": "Supplement Packaging",
    "question": "Do you specialize in food supplement and health packaging?",
    "answer": "Yes, tactical food supplement, organic healthcare, wellness syrups, and herbal medicine packaging are core specializations with high-converting, compliant 3D renders.",
    "keywords": ["supplement", "food packaging", "medicine", "herbal", "organic", "healthcare", "3d render"],
    "category": "packaging",
    "status": "published"
  },
  {
    "id": "faq_motion_graphics",
    "shortTitle": "Motion Graphics & Ads",
    "question": "Can you create motion graphics and social video ads?",
    "answer": "Absolutely! I produce dynamic 2D motion graphics, kinetic typography, promotional video ads, Instagram/Facebook Reels, and animated logo reveals using Adobe After Effects.",
    "keywords": ["motion", "video", "animation", "after effects", "reels", "ads", "promo"],
    "category": "motion",
    "status": "published"
  },
  {
    "id": "faq_design_process",
    "shortTitle": "Design Process & Steps",
    "question": "What is your step-by-step design workflow?",
    "answer": "My workflow follows 5 structured steps: 1. Discovery & Project Brief, 2. Market Research & Moodboard, 3. Concept Generation & 3D Mockups, 4. Iterative Client Revisions, and 5. Final Asset Delivery.",
    "keywords": ["process", "workflow", "steps", "how you work", "phases", "methodology"],
    "category": "process",
    "status": "published"
  },
  {
    "id": "faq_turnaround_timeline",
    "shortTitle": "Delivery Timeline",
    "question": "What is your typical project delivery timeline?",
    "answer": "Initial concepts are typically presented within 3 to 5 business days. Full brand identity systems take 5–10 days, while packaging labels or promo videos take approximately 3–6 days.",
    "keywords": ["timeline", "turnaround", "how long", "delivery", "days", "deadline", "fast"],
    "category": "process",
    "status": "published"
  },
  {
    "id": "faq_revision_policy",
    "shortTitle": "Revision & Polish Policy",
    "question": "What is your revision and satisfaction policy?",
    "answer": "I offer unlimited design revisions within the agreed project scope during the active milestone to guarantee you are 100% thrilled with the outcome before final file sign-off.",
    "keywords": ["revision", "revisions", "changes", "satisfaction", "guarantee", "feedback"],
    "category": "process",
    "status": "published"
  },
  {
    "id": "faq_payment_methods",
    "shortTitle": "Payment Terms & Methods",
    "question": "What payment methods and terms do you accept?",
    "answer": "I accept Bank Wire Transfer, Wise (international), and local mobile banking (bKash/Nagad in Bangladesh). Typical terms are 50% upfront deposit and 50% upon final approval before delivery.",
    "keywords": ["payment", "bank", "wise", "bkash", "deposit", "terms", "invoice", "pay"],
    "category": "payment",
    "status": "published"
  },
  {
    "id": "faq_availability_hours",
    "shortTitle": "Location & Work Hours",
    "question": "Where are you located and what are your working hours?",
    "answer": "I am based in Jashore, Bangladesh (UTC+6) and available for Remote and Hybrid collaborations globally. Standard WhatsApp responses are under 1 hour during active business hours.",
    "keywords": ["location", "hours", "timezone", "bangladesh", "dhaka", "remote", "availability"],
    "category": "availability",
    "status": "published"
  },
  {
    "id": "faq_portfolio_behance",
    "shortTitle": "Portfolio & Case Studies",
    "question": "Where can I view your latest verified case studies?",
    "answer": "You can explore comprehensive case studies, branding suites, and packaging renders directly on Behance at behance.net/rashedpervej.",
    "keywords": ["portfolio", "behance", "case studies", "work", "projects", "samples"],
    "category": "portfolio",
    "status": "published"
  },
  {
    "id": "faq_hire_contact",
    "shortTitle": "Hire & Direct Contact",
    "question": "How do I get in touch or hire Rashed directly?",
    "answer": "You can reach out instantly via WhatsApp at +8801932623969 or email rashedpervej2011@gmail.com with your project brief. You can also book a 1-on-1 discovery call.",
    "keywords": ["hire", "contact", "whatsapp", "email", "talk to rashed", "meeting", "call"],
    "category": "contact",
    "status": "published"
  },
  {
    "id": "faq_software_tools",
    "shortTitle": "Design Software & Tools",
    "question": "What creative design software do you specialize in?",
    "answer": "I specialize in Adobe Photoshop, Adobe Illustrator, Adobe After Effects, Canva, CapCut, and modern AI-assisted visual production workflows.",
    "keywords": ["software", "tools", "photoshop", "illustrator", "after effects", "canva"],
    "category": "technical",
    "status": "published"
  },
  {
    "id": "faq_brand_modernization",
    "shortTitle": "Logo Modernization",
    "question": "Can you refresh or modernize an existing brand logo?",
    "answer": "Yes! I conduct brand audits to refine existing logos and visual identity elements, enhancing modern scalability while preserving your established brand recognition.",
    "keywords": ["redesign", "refresh", "modernize", "rebrand", "audit", "logo update"],
    "category": "branding",
    "status": "published"
  },
  {
    "id": "faq_chaldal_experience",
    "shortTitle": "Chaldal Experience",
    "question": "Can you describe your experience at Chaldal Ltd.?",
    "answer": "At Chaldal Ltd., I worked for over 3 years (2020–2023) designing high-impact digital e-commerce campaigns, FMCG brand assets, and leading junior visualizers.",
    "keywords": ["chaldal", "past experience", "fmcg", "campaigns", "ecommerce"],
    "category": "general",
    "status": "published"
  }
];

export interface ChatTrainingRule {
  id: string;
  category: "tone" | "behavior" | "pricing" | "career" | "scope";
  title: string;
  instruction: string;
  type: "do" | "dont" | "guide";
  isActive: boolean;
  priority: number;
}

export interface SuggestedFaqItem {
  id: string;
  question: string;
  answer: string;
  shortTitle?: string;
  category: string;
  keywords: string[];
  reason: string;
  status: "suggested" | "published" | "dismissed";
  sourceInsight: string;
  confidenceScore: number;
}

export const FALLBACK_CHAT_TRAINING_RULES: ChatTrainingRule[] = [
  {
    id: "rule_pingpong_dialogue",
    category: "tone",
    title: "Conversational Ping-Pong (Under 40 Words)",
    instruction: "Write 1–3 short, natural sentences (under 40 words total). Speak like a warm, creative design peer sitting across the table. Ask at most ONE question to advance the dialogue naturally.",
    type: "do",
    isActive: true,
    priority: 1
  },
  {
    id: "rule_no_questionnaires",
    category: "behavior",
    title: "No Questionnaire Dumps or Bulleted Surveys",
    instruction: "ABSOLUTELY NEVER dump a list of 4–5 intake questions (e.g. SKU count, timeline, budget, bottle size, target audience) in a single turn. Avoid corporate survey clichés like 'নিম্নলিখিত তথ্য দিন'.",
    type: "dont",
    isActive: true,
    priority: 2
  },
  {
    id: "rule_no_raw_links",
    category: "behavior",
    title: "Never Output Raw URLs or Markdown Links in Prose",
    instruction: "NEVER output raw URLs (https://..., be.net/...) or markdown links ([text](url)) inside text. The chat interface automatically renders interactive, clickable buttons for Behance, WhatsApp, Email, and Project Brief.",
    type: "dont",
    isActive: true,
    priority: 3
  },
  {
    id: "rule_multilingual_fluency",
    category: "tone",
    title: "Natural Multilingual Fluency (Bengali, Banglish & English)",
    instruction: "Naturally mirror the visitor's language and vibe. Understand colloquial Banglish ('packaging koren?', 'new project korte chai'), Bengali script (বাংলা), and English with native fluency.",
    type: "do",
    isActive: true,
    priority: 4
  },
  {
    id: "rule_pricing_callback_guard",
    category: "pricing",
    title: "No Self-Quoted Dollar Amounts (Custom Brief & Call-back Only)",
    instruction: "NEVER invent or quote specific starting dollar amounts ($300, $250, etc.) on your own unless explicit pricing guidelines are configured by the admin. Explain that pricing is 100% customized based on scope, deliverables, and timeline. Invite the visitor to submit a brief or message on WhatsApp to schedule a discussion/call back.",
    type: "dont",
    isActive: true,
    priority: 5
  },
  {
    id: "rule_job_offer_respect",
    category: "career",
    title: "Respectful Handling of Full-Time / Permanent Job Offers",
    instruction: "Never bluntly reject permanent, full-time, or in-house role inquiries. Respond with warmth and professional dignity: state that Rashed is open to discussing high-impact Senior Visualizer, Art Director, or Design Lead roles with ambitious brands and creative teams. Advise connecting directly with Rashed via WhatsApp or Email.",
    type: "guide",
    isActive: true,
    priority: 6
  },
  {
    id: "rule_strict_scope_guard",
    category: "scope",
    title: "Strict Portfolio Scope Guard",
    instruction: "Only answer inquiries regarding Rashed Pervej, his creative portfolio, services (brand identity, packaging, motion graphics), tools, experience, pricing approach, and hiring. Politely decline off-topic programming, homework, trivia, or recipes.",
    type: "do",
    isActive: true,
    priority: 7
  },
  {
    id: "rule_selective_buttons",
    category: "behavior",
    title: "Selective Action Buttons on Explicit Intent Only",
    instruction: "Do not attach action buttons to general informational replies. Only display buttons when explicit intent is detected: portfolio links -> [View on Behance]; custom brief/quote requests -> [Submit Project Brief]; direct contact or job inquiries -> [WhatsApp Rashed] & [Email Rashed].",
    type: "do",
    isActive: true,
    priority: 8
  }
];

export const FALLBACK_AI_SUGGESTED_FAQS: SuggestedFaqItem[] = [
  {
    id: "sugg_faq_dieline_specs",
    shortTitle: "Print-Ready Dieline Standards",
    question: "What technical specifications and print formats are included for packaging dielines?",
    answer: "Every packaging project includes 100% production-ready vector dielines in Adobe Illustrator (.AI), PDF/X-4 (CMYK with bleed and trim marks), EPS, and high-resolution 3D mockups. I also coordinate directly with your printing house or packaging vendor to ensure zero pre-press errors.",
    category: "packaging",
    keywords: ["dieline", "print ready", "pre-press", "cmyk", "vector", "bleed", "packaging specs"],
    reason: "High visitor intent during food supplement and cosmetic packaging inquiries.",
    sourceInsight: "Detected 14 visitor questions regarding printing vendor compatibility",
    confidenceScore: 96,
    status: "suggested"
  },
  {
    id: "sugg_faq_brand_guidelines",
    shortTitle: "Brand Styleguide Deliverables",
    question: "What is included inside a complete Brand Identity Guideline?",
    answer: "A complete brand identity kit delivers primary & secondary logo marks, responsive icon versions, brand color formulas (HEX, RGB, CMYK, Pantone), typography hierarchy, brand asset do's and don'ts, social media templates, and stationery mockups.",
    category: "branding",
    keywords: ["brand guidelines", "styleguide", "identity kit", "pantone", "typography", "logo system"],
    reason: "Frequent pre-brief question from tech platforms and retail startups.",
    sourceInsight: "Identified high correlation with logo and rebrand inquiries",
    confidenceScore: 92,
    status: "suggested"
  },
  {
    id: "sugg_faq_turnaround_time",
    shortTitle: "Typical Delivery Timelines",
    question: "What is the typical delivery timeline for brand and packaging projects?",
    answer: "Standard project turnaround is 10 to 14 business days for comprehensive Brand Identity packages, 7 to 10 days for custom Packaging & Label suites, and 3 to 5 days for promotional Motion Graphics, with structured feedback milestones throughout.",
    category: "services",
    keywords: ["timeline", "delivery", "turnaround", "how long", "schedule", "deadline"],
    reason: "Consistently asked by clients before finalizing project briefs.",
    sourceInsight: "Top requested clarification during lead qualification",
    confidenceScore: 89,
    status: "suggested"
  },
  {
    id: "sugg_faq_commercial_nda",
    shortTitle: "Confidentiality & NDAs",
    question: "Can you sign a Non-Disclosure Agreement (NDA) before we share our project brief?",
    answer: "Yes, absolutely. Rashed frequently signs bilateral NDAs with international startups, pharmaceutical manufacturers, and agencies to guarantee complete confidentiality for unreleased products and proprietary formulas.",
    category: "general",
    keywords: ["nda", "confidentiality", "non-disclosure", "privacy", "commercial secret"],
    reason: "Crucial trust factor for enterprise and private-label supplement brands.",
    sourceInsight: "Common barrier for high-budget corporate proposals",
    confidenceScore: 94,
    status: "suggested"
  },
  {
    id: "sugg_faq_revision_policy",
    shortTitle: "Revision Rounds & Feedback",
    question: "How are revisions handled during a design collaboration?",
    answer: "Projects include up to 3 structured revision rounds. Feedback is organized collaboratively via WhatsApp voice/chat, Google Meet, or Figma/Behance review links to ensure seamless iterations without scope creep.",
    category: "general",
    keywords: ["revisions", "feedback", "changes", "rounds", "collaboration", "review"],
    reason: "Frequently asked to understand post-delivery warranty and collaboration flexibility.",
    sourceInsight: "Reduces friction during client onboarding",
    confidenceScore: 88,
    status: "suggested"
  },
  {
    id: "sugg_faq_3d_ecommerce",
    shortTitle: "3D Renders for E-Commerce",
    question: "Do you provide 3D product renders optimized for Amazon and Shopify listings?",
    answer: "Yes! In addition to packaging artwork, I deliver photorealistic 3D pouch, box, and bottle renders on pure white backgrounds (for Amazon A+ content & Shopify) as well as atmospheric lifestyle scenes for high-converting social media ads.",
    category: "skills",
    keywords: ["3d render", "amazon", "shopify", "product render", "photorealistic", "mockup", "e-commerce"],
    reason: "Surge in DTC supplement brands requiring Amazon A+ and Shopify visual assets.",
    sourceInsight: "Extracted from recent client brief keywords",
    confidenceScore: 95,
    status: "suggested"
  }
];
