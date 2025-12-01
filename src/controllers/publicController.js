const Setting = require('../models/Setting');
const Service = require('../models/Service');

// Get public settings (no auth required)
exports.getPublicSettings = async (req, res) => {
    try {
        const settings = await Setting.find({
            isPublic: true
        }).select('key value type');

        res.status(200).json({
            success: true,
            settings
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getPublicServices = async (req, res) => {
    try {
        const { category, search } = req.query;
        const filter = { status: 'active' };
        if (category) filter.category = category;
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        const services = await Service.find(filter).sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            count: services.length,
            services
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
