// exports.dbs = {
// 	mysql_project_db: {
//         read: 'redoq-dev-db-cluster.cluster-cs0kxsrqdtm7.ap-south-1.rds.amazonaws.com',
//         write: 'redoq-dev-db-cluster.cluster-cs0kxsrqdtm7.ap-south-1.rds.amazonaws.com',
//         database: 'project_khosla_scratchcard',
//     },
// };

// exports.dbs_login = {
//     apiservice: {
//         user: 'prasun.05jhgfd',
//         password: 'YGE#GDijhgfcxz'
//     }
// };


// exports.mongodbs = {
//     mysql_dine_server_common: {
//         host: 'redoq.mongodb.net',
//         database: 'redoq_db',
//         user: 'root',
//         password: 'a1b2c3',
//     }
// };
exports.dbs = {
	mysql_project_db: {
        read: '127.0.0.1',
        write: '127.0.0.1',
        database: 'project_dev_medicity',
    },
};

exports.dbs_login = {
    apiservice: {
        user: 'root',
        password: ''
    }
};


exports.mongodbs = {
    mysql_dine_server_common: {
        host: '127.0.0.1',
        database: 'project_dev_medicity',
        user: 'root',
        password: '',
    }
};