const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Product = require('./models/Product');
const ServicePackage = require('./models/ServicePackage');
const Patient = require('./models/Patient');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const products = [
    {
        name: "Aloe Vera Gel",
        subtitle: "96% Pure Aloe Vera | With Glycerin & Vitamin E",
        description: "Experience the gentle touch of nature with Siddhaka Naturals Aloe Vera Gel. Enriched with 96% pure Aloe Vera, Glycerin and Vitamin E, this lightweight, non-greasy gel deeply hydrates and soothes skin while promoting healing and glow.",
        image: "/DSC09521.JPG",
        category: "gels",
        keyIngredients: ["Natural Aloe Vera Juice (96%)", "Glycerin", "Vitamin E", "Polysorbate 20", "Preservatives", "Fragrance"],
        freeFrom: ["Parabens", "Benzophenone", "Mineral oil", "BHT", "Animal Ingredients", "Artificial Coloring"],
        benefits: ["Deep Hydration - Powered by 96% pure Aloe Vera and Glycerin", "Calms Irritation & Redness", "Nourishes & Repairs Skin", "Lightweight & Non-Greasy", "Multipurpose Use", "Safe for Daily Use"]
    },
    {
        name: "Facial Oil",
        subtitle: "100% Natural Ayurveda Formula",
        description: "A 100% Natural Ayurveda Formula to soothe, hydrate and nourish skin. Offers hydrating and toning properties for a glowing complexion and softer, smoother skin.",
        image: "/DSC09437.JPG",
        category: "oils",
        keyIngredients: ["Virgin Coconut Oil", "Shatavari", "Aloe barbadensis", "Sandalwood", "Vetiver", "Amla"],
        freeFrom: ["Parabens", "Benzophenone", "Mineral oil", "BHT", "Animal Ingredients", "Artificial Coloring", "Synthetic fragrances"],
        benefits: ["Deep Hydration & Moisturization", "Anti-aging & Skin Rejuvenation", "Toning & Brightening", "Calming & Anti-Inflammatory", "Glowing & Even-Toned Complexion", "Lightweight & Fast-Absorbing"]
    },
    {
        name: "Hibiscus Hair Oil",
        subtitle: "Pure Ayurvedic Formulation for Strong, Healthy Hair",
        description: "Rediscover your hair's natural vitality with Siddhaka Hibiscus Hair Oil — a traditional Ayurvedic blend made from time-honored botanicals like Hibiscus, Henna, Amla and Virgin Coconut Oil.",
        image: "/DSC09465.JPG",
        category: "oils",
        keyIngredients: ["Hibiscus flower Extracts", "Henna", "Amla", "Virgin Coconut Oil", "Approved preservatives"],
        freeFrom: ["Parabens", "Benzophenone", "Mineral oil", "BHT", "Animal Ingredients", "Synthetic fragrances"],
        benefits: ["Stimulates Healthy Hair Growth", "Strengthens Hair Roots", "Reduces Hair Fall", "Prevents Premature Greying", "Deep Scalp Nourishment", "Improves Hair Texture"]
    },
    {
        name: "Manjishta Glow Gel",
        subtitle: "Ayurvedic Skin Brightening & Blemish Reducing Gel",
        description: "Siddhaka Manjishta Glow Gel is a gentle, Ayurvedic skin care formulation infused with the natural goodness of Manjishta Essence Water, soothing Rose water, hydrating Glycerin and nourishing Vitamin E.",
        image: "/DSC09480.JPG",
        category: "gels",
        keyIngredients: ["Manjishta Essence Water", "Rose Water", "Glycerin", "Vitamin E"],
        freeFrom: ["Parabens", "Benzophenone", "Mineral oil", "BHT", "Animal Ingredients", "Artificial Coloring"],
        benefits: ["Brightens and Evens Skin Tone", "Hydrates and Softens Skin", "Soothes and Refreshes", "Fights Early Signs of Aging", "Purifies and Detoxifies", "Non-greasy & Lightweight"]
    },
    {
        name: "Olive Body Lotion",
        subtitle: "Rich & Creamy Nourishing Body Lotion",
        description: "Experience the luxurious touch of nature with our Olive Body Lotion, a rich and creamy formulation crafted to deeply nourish, hydrate and revitalize your skin.",
        image: "/olive-body-lotion-product.jpg",
        category: "lotions",
        keyIngredients: ["Aqua", "Pure Olive Oil", "Emulsifying Wax", "Stearic Acid", "Preservatives"],
        freeFrom: ["Parabens", "Benzophenone", "Mineral oil", "BHT", "Animal Ingredients"],
        benefits: ["Deep Hydration", "Olive oil Richness", "Improves Skin Texture", "Lightweight & Non-Greasy", "Skin Barrier Support", "Gentle on All Skin Types"]
    }
];

const packages = [
    {
        name: "Head Massage",
        duration: 30,
        category: "wellness",
        subcategory: "head-hair",
        description: "Refreshing treatment, which is done by using medicated Herbal oil.",
        includes: ["Head Massage with medicated Herbal oil"],
        concurrentServices: 2
    },
    {
        name: "Shiro Dhara",
        duration: 45,
        category: "wellness",
        subcategory: "head-hair",
        description: "A procedure consisting of continuous pouring of medicated oil onto the forehead.",
        includes: ["Shiro Dhara treatment"],
        concurrentServices: 2
    },
    {
        name: "Full Day Package",
        duration: 360,
        category: "special",
        subcategory: "full-day",
        description: "Complete day wellness package",
        includes: ["Head massage", "Facial Treatment", "Body oil massage", "Shashtika Shali Pinda Sweda", "Shiro Dhara", "Steam bath or Herbal bath"],
        concurrentServices: 2
    },
    {
        name: "Weight Management & Slimming Package",
        duration: 420, // 7 hours total roughly or 1 hour daily for 7 days (simplified as one-time 7-hour block or similar for logic)
        category: "signature",
        subcategory: "7-day",
        description: "7-day weight management program",
        includes: ["Powder Massage with Steam Bath", "Body Oil Massage with Steam Bath", "Body Oil Massage with Herbal Poultice Fomentation", "Body Oil Massage with Steam Therapy", "Internal medicines with Dietary & Lifestyle guidance"],
        benefits: "Eliminates toxins, improves blood circulation, reduces excess fat, firms body tissues and promotes healthy weight loss naturally",
        concurrentServices: 1
    }
];

const importData = async () => {
    try {
        await User.deleteMany();
        await Product.deleteMany();
        await ServicePackage.deleteMany();
        await Patient.deleteMany();

        // Create admin user
        const adminUser = await User.create({
            name: 'Admin User',
            email: 'admin@siddhaka.com',
            password: 'admin123',
            role: 'admin'
        });

        await Product.insertMany(products);
        await ServicePackage.insertMany(packages);

        console.log('Data Imported!');
        process.exit();
    } catch (error) {
        console.error(`${error}`);
        process.exit(1);
    }
};

const destroyData = async () => {
    try {
        await User.deleteMany();
        await Product.deleteMany();
        await ServicePackage.deleteMany();
        await Patient.deleteMany();

        console.log('Data Destroyed!');
        process.exit();
    } catch (error) {
        console.error(`${error}`);
        process.exit(1);
    }
};

if (process.argv[2] === '-d') {
    destroyData();
} else {
    importData();
}
