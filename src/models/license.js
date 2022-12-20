import mongoose from "mongoose";

const LicenseSchema = new mongoose.Schema({
    name: {},
    link: {},
})

const License = mongoose.model('License', LicenseSchema);

export default License;