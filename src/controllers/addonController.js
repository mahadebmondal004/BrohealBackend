const ServiceAddon = require('../models/ServiceAddon');
let AddonService = null;
try {
    AddonService = require('../models/AddonService');
} catch (e) {
    AddonService = null;
}

// Get all active addons
exports.getAddons = async (req, res) => {
    try {
        const { serviceId, category } = req.query;

        // Prefer admin-managed AddonService if available
        if (AddonService) {
            const filter = { status: 'active' };
            if (category) filter.category = category;

            const raw = await AddonService.find(filter).sort({ createdAt: -1 });
            const addons = raw.map(a => ({
                _id: a._id,
                name: a.name,
                description: a.description,
                price: a.offerPrice != null ? a.offerPrice : (a.price != null ? a.price : (a.basePrice != null ? a.basePrice : 0)),
                duration: a.duration || 0
            }));

            return res.status(200).json({ success: true, count: addons.length, addons });
        }

        // Fallback to legacy ServiceAddon
        const filter = { isActive: true };
        if (category) filter.category = category;

        let addons = await ServiceAddon.find(filter).sort({ displayOrder: 1, name: 1 });
        if (serviceId) {
            addons = addons.filter(addon =>
                addon.applicableServices.length === 0 ||
                addon.applicableServices.some(id => id.toString() === serviceId)
            );
        }

        return res.status(200).json({ success: true, count: addons.length, addons });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Get addon by ID
exports.getAddonById = async (req, res) => {
    try {
        if (AddonService) {
            const a = await AddonService.findById(req.params.id);
            if (a) {
                return res.status(200).json({
                    success: true,
                    addon: {
                        _id: a._id,
                        name: a.name,
                        description: a.description,
                        price: a.offerPrice != null ? a.offerPrice : (a.price != null ? a.price : (a.basePrice != null ? a.basePrice : 0)),
                        duration: a.duration || 0
                    }
                });
            }
        }

        const addon = await ServiceAddon.findById(req.params.id).populate('applicableServices', 'title');
        if (!addon) {
            return res.status(404).json({ success: false, message: 'Addon not found' });
        }
        return res.status(200).json({ success: true, addon });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Create addon (admin only)
exports.createAddon = async (req, res) => {
    try {
        const addon = await ServiceAddon.create(req.body);

        res.status(201).json({
            success: true,
            message: 'Addon created successfully',
            addon
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update addon (admin only)
exports.updateAddon = async (req, res) => {
    try {
        const addon = await ServiceAddon.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!addon) {
            return res.status(404).json({
                success: false,
                message: 'Addon not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Addon updated successfully',
            addon
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Delete addon (admin only)
exports.deleteAddon = async (req, res) => {
    try {
        const addon = await ServiceAddon.findByIdAndDelete(req.params.id);

        if (!addon) {
            return res.status(404).json({
                success: false,
                message: 'Addon not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Addon deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Toggle addon active status (admin only)
exports.toggleAddonStatus = async (req, res) => {
    try {
        const addon = await ServiceAddon.findById(req.params.id);

        if (!addon) {
            return res.status(404).json({
                success: false,
                message: 'Addon not found'
            });
        }

        addon.isActive = !addon.isActive;
        await addon.save();

        res.status(200).json({
            success: true,
            message: `Addon ${addon.isActive ? 'activated' : 'deactivated'} successfully`,
            addon
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
