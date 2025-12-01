const roleCheck = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.'
            });
        }

        console.log('Role Check Debug:', {
            userRole: req.user.role,
            allowedRoles,
            hasAccess: allowedRoles.includes(req.user.role)
        });

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Required role: ${allowedRoles.join(' or ')}. Current role: ${req.user.role}`
            });
        }

        next();
    };
};

module.exports = roleCheck;
