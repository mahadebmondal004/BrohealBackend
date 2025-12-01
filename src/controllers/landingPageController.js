const LandingPage = require('../models/LandingPage');

// Get landing page content (public)
exports.getLandingContent = async (req, res) => {
    try {
        const content = await LandingPage.getContent();

        // Filter only active items
        const filteredContent = {
            ...content.toObject(),
            heroSlides: content.heroSlides.filter(slide => slide.isActive).sort((a, b) => a.order - b.order),
            whyChooseUs: content.whyChooseUs.filter(item => item.isActive).sort((a, b) => a.order - b.order),
            testimonials: content.testimonials.filter(item => item.isActive).sort((a, b) => a.order - b.order),
            howItWorks: content.howItWorks.sort((a, b) => a.order - b.order)
        };

        res.status(200).json({
            success: true,
            content: filteredContent
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get landing content for admin (includes inactive items)
exports.getAdminLandingContent = async (req, res) => {
    try {
        const content = await LandingPage.getContent();

        res.status(200).json({
            success: true,
            content
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update landing page content (admin only)
exports.updateLandingContent = async (req, res) => {
    try {
        let content = await LandingPage.findOne();

        if (!content) {
            content = await LandingPage.getContent();
        }

        // Update fields
        Object.keys(req.body).forEach(key => {
            if (req.body[key] !== undefined) {
                content[key] = req.body[key];
            }
        });

        await content.save();

        res.status(200).json({
            success: true,
            message: 'Landing page content updated successfully',
            content
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update specific section
exports.updateSection = async (req, res) => {
    try {
        const { section } = req.params;
        const updates = req.body;

        let content = await LandingPage.findOne();
        if (!content) {
            content = await LandingPage.getContent();
        }

        if (!content[section]) {
            return res.status(400).json({
                success: false,
                message: 'Invalid section'
            });
        }

        content[section] = updates;
        await content.save();

        res.status(200).json({
            success: true,
            message: `${section} section updated successfully`,
            content
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
