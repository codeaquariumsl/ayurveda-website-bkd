const mongoose = require('mongoose');
const dns = require('dns');

// Use reliable DNS servers (Google / Cloudflare) to prevent querySrv ECONNREFUSED with MongoDB Atlas SRV records
dns.setServers(['8.8.8.8', '1.1.1.1']);

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://codeaquariumsl_db_user:UmRUdiI5yHhnHYnK@cacluster.eoeixnp.mongodb.net/?appName=CACluster');
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
