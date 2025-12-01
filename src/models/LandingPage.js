const mongoose = require('mongoose');

const landingPageSchema = new mongoose.Schema({
    // Hero Section
    heroSlides: [{
        image: String,
        title: String,
        subtitle: String,
        ctaText: String,
        ctaLink: String,
        isActive: { type: Boolean, default: true },
        order: Number
    }],

    // Why Choose Us
    whyChooseUs: [{
        icon: String, // lucide icon name
        title: String,
        description: String,
        isActive: { type: Boolean, default: true },
        order: Number
    }],

    // About Section
    about: {
        image: String,
        title: { type: String, default: 'About BroHeal' },
        paragraphs: [String],
        stats: [{
            value: String,
            label: String
        }],
        ctaText: String,
        ctaLink: String
    },

    // Services (references actual services but can override display)
    serviceSection: {
        title: { type: String, default: 'Our Services' },
        subtitle: String,
        showDiscounts: { type: Boolean, default: true },
        showRatings: { type: Boolean, default: true },
        showBookings: { type: Boolean, default: true }
    },

    // How It Works
    howItWorks: [{
        step: Number,
        title: String,
        description: String,
        order: Number
    }],

    // Testimonials
    testimonials: [{
        name: String,
        role: String,
        image: String,
        rating: { type: Number, min: 1, max: 5 },
        text: String,
        isActive: { type: Boolean, default: true },
        order: Number
    }],

    // Footer
    footer: {
        description: String,
        quickLinks: [{
            label: String,
            link: String
        }],
        therapistLinks: [{
            label: String,
            link: String
        }],
        playStoreLink: String,
        appStoreLink: String,
        copyright: String
    }
}, {
    timestamps: true
});

// There should only be one landing page document
landingPageSchema.statics.getContent = async function () {
    let content = await this.findOne();
    if (!content) {
        // Create default content
        content = await this.create({
            heroSlides: [
                {
                    image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1200',
                    title: 'Professional Therapy at Your Doorstep',
                    subtitle: 'Book certified therapists for massage, spa & wellness services',
                    ctaText: 'Book Now',
                    ctaLink: '/login',
                    order: 1
                }
            ],
            whyChooseUs: [
                {
                    icon: 'Shield',
                    title: 'Verified Professionals',
                    description: 'All therapists are certified and background-verified',
                    order: 1
                },
                {
                    icon: 'Award',
                    title: 'Quality Service',
                    description: 'Top-rated professionals with 4.5+ ratings',
                    order: 2
                },
                {
                    icon: 'CheckCircle',
                    title: 'Easy Booking',
                    description: 'Simple 3-step booking process',
                    order: 3
                },
                {
                    icon: 'DollarSign',
                    title: 'Pay After Service',
                    description: 'Flexible payment options - pay only after service completion',
                    order: 4
                },
                {
                    icon: 'Headphones',
                    title: '24/7 Support',
                    description: 'Round-the-clock customer assistance',
                    order: 5
                }
            ],
            about: {
                image: 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=600',
                paragraphs: [
                    'BroHeal is India\'s leading wellness platform connecting you with certified therapists for professional massage, spa, and therapy services at your doorstep.',
                    'Founded in 2024, we\'ve served over 50,000+ happy customers with our commitment to quality, safety, and customer satisfaction.',
                    'Whether you need relaxation or therapeutic treatment, BroHeal brings professional wellness services to your home with transparent pricing and guaranteed quality.'
                ],
                stats: [
                    { value: '50K+', label: 'Happy Customers' },
                    { value: '500+', label: 'Therapists' },
                    { value: '25+', label: 'Cities' }
                ],
                ctaText: 'Join BroHeal Today',
                ctaLink: '/login'
            },
            howItWorks: [
                {
                    step: 1,
                    title: 'Choose Service',
                    description: 'Select from our range of wellness services and preferred time',
                    order: 1
                },
                {
                    step: 2,
                    title: 'Book Therapist',
                    description: 'Choose your preferred therapist and confirm booking',
                    order: 2
                },
                {
                    step: 3,
                    title: 'Relax & Enjoy',
                    description: 'Therapist arrives at your location and delivers premium service',
                    order: 3
                }
            ],
            testimonials: [
                {
                    name: 'Priya Sharma',
                    role: 'Regular Customer',
                    image: 'https://i.pravatar.cc/150?img=1',
                    rating: 5,
                    text: 'BroHeal has been a lifesaver! The therapists are professional and the booking process is so simple.',
                    order: 1
                }
            ],
            footer: {
                description: 'India\'s leading wellness platform bringing professional therapy services to your doorstep.',
                quickLinks: [
                    { label: 'Home', link: '/#home' },
                    { label: 'About', link: '/#about' },
                    { label: 'Services', link: '/#services' },
                    { label: 'Contact', link: '/#contact' }
                ],
                therapistLinks: [
                    { label: 'Become a Therapist', link: '/login' },
                    { label: 'Therapist Login', link: '/login' },
                    { label: 'Earnings', link: '/login' },
                    { label: 'Support', link: '/login' }
                ],
                playStoreLink: '#',
                appStoreLink: '#',
                copyright: '© 2024 BroHeal. All rights reserved.'
            }
        });
    }
    return content;
};

module.exports = mongoose.model('LandingPage', landingPageSchema);
