const Subcategory = require('../models/Subcategory');

// @desc    Get all subcategories
// @route   GET /api/subcategories
// @access  Public
const getSubcategories = async (req, res) => {
    try {
        const subcategories = await Subcategory.find({}).sort({ name: 1 });
        res.json(subcategories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single subcategory
// @route   GET /api/subcategories/:id
// @access  Public
const getSubcategoryById = async (req, res) => {
    try {
        const subcategory = await Subcategory.findById(req.params.id);
        if (subcategory) {
            res.json(subcategory);
        } else {
            res.status(404).json({ message: 'Subcategory not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a subcategory
// @route   POST /api/subcategories
// @access  Private/Admin
const createSubcategory = async (req, res) => {
    try {
        const { name, slug } = req.body;

        const subcategoryExists = await Subcategory.findOne({ slug: slug.toLowerCase() });
        if (subcategoryExists) {
            return res.status(400).json({ message: 'Subcategory with this slug already exists' });
        }

        const subcategory = new Subcategory({
            name,
            slug: slug.toLowerCase()
        });

        const createdSubcategory = await subcategory.save();
        res.status(201).json(createdSubcategory);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update a subcategory
// @route   PUT /api/subcategories/:id
// @access  Private/Admin
const updateSubcategory = async (req, res) => {
    try {
        const { name, slug } = req.body;
        const subcategory = await Subcategory.findById(req.params.id);

        if (subcategory) {
            const oldSlug = subcategory.slug;
            if (slug && slug.toLowerCase() !== subcategory.slug) {
                const subcategoryExists = await Subcategory.findOne({ slug: slug.toLowerCase() });
                if (subcategoryExists) {
                    return res.status(400).json({ message: 'Subcategory with this slug already exists' });
                }
            }

            subcategory.name = name || subcategory.name;
            subcategory.slug = slug ? slug.toLowerCase() : subcategory.slug;

            const updatedSubcategory = await subcategory.save();

            // Update all packages that use the old slug to use the new slug
            if (slug && slug.toLowerCase() !== oldSlug) {
                const ServicePackage = require('../models/ServicePackage');
                await ServicePackage.updateMany(
                    { subcategory: oldSlug },
                    { $set: { subcategory: slug.toLowerCase() } }
                );
            }

            res.json(updatedSubcategory);
        } else {
            res.status(404).json({ message: 'Subcategory not found' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete a subcategory
// @route   DELETE /api/subcategories/:id
// @access  Private/Admin
const deleteSubcategory = async (req, res) => {
    try {
        const subcategory = await Subcategory.findById(req.params.id);
        if (subcategory) {
            const oldSlug = subcategory.slug;
            await Subcategory.deleteOne({ _id: req.params.id });

            // Clear subcategory field on all packages using the deleted subcategory
            const ServicePackage = require('../models/ServicePackage');
            await ServicePackage.updateMany(
                { subcategory: oldSlug },
                { $set: { subcategory: '' } }
            );

            res.json({ message: 'Subcategory removed and package usages updated' });
        } else {
            res.status(404).json({ message: 'Subcategory not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getSubcategories,
    getSubcategoryById,
    createSubcategory,
    updateSubcategory,
    deleteSubcategory
};
