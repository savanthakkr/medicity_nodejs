exports.JWT_SECRET = "medicity_secret_key_2026";

exports.vals = {
	confirmEmails: {
		from: "no-reply@test-app.com"
	},
	dbList: {
		mysql_project_db: 'redoq_db'
	},
	validDbs: [
		'mysql_project_db'
	],
	clientIp: '',
	defaultDB: 'mysql_project_db',
	tz: 'Europe/London',
	hash_key: '',
	auth_key: '',
	app_env: 'PROD',
	appUrl: 'http://localhost:3000/api/webapi',
	host: '',
	origin: '',
	login_user: {},
	dbconn: '',
	customer: {},
	service_name:"apiservice",
	regex:{
		postcode_regex: /^(GIR[ ]?0AA|((AB|AL|B|BA|BB|BD|BH|BL|BN|BR|BS|BT|CA|CB|CF|CH|CM|CO|CR|CT|CV|CW|DA|DD|DE|DG|DH|DL|DN|DT|DY|E|EC|EH|EN|EX|FK|FY|G|GL|GY|GU|HA|HD|HG|HP|HR|HS|HU|HX|IG|IM|IP|IV|JE|KA|KT|KW|KY|L|LA|LD|LE|LL|LN|LS|LU|M|ME|MK|ML|N|NE|NG|NN|NP|NR|NW|OL|OX|PA|PE|PH|PL|PO|PR|RG|RH|RM|S|SA|SE|SG|SK|SL|SM|SN|SO|SP|SR|SS|ST|SW|SY|TA|TD|TF|TN|TQ|TR|TS|TW|UB|W|WA|WC|WD|WF|WN|WR|WS|WV|YO|ZE)(\d[\dA-Z]?[ ]?\d[ABD-HJLN-UW-Z]{2}))|BFPO[ ]?\d{1,4})$/i,
	alpha_space: /^[\pL\s]+$/,
	card_security_code: /^\d{3,4}/,
	cardholder_name: /^[a-zA-Z 0-9&-.']{1,50}/,
	card_expiry: /^(0[1-9]|1[012])\d{2}/,
	},
	encKeys: {
		DEV: {
			"k1": "",
			"k2": ""
		},
		PROD: {
			"k1": "",
			"k2": ""
		}
	},
	secretKeys: {
		DEV: {
			"APISERVICE": "462D4A61eqweqweqweq87032733576-APISERVICE-2443264629eqweqweqweqwe6556A586E32",
		},
		PROD: {
			"WEBSERVICE": "68566D5971eqweqweqwe7A24432646-AS-367556B5870327335czxczczx452848",
		}
	},
	sms: {
		"Nexmo": {
			"api_key": "3clgkgg5f",
			"api_secret": "kXewSsr",
			"url": "https://rest.nexmo.com/sms/json"
		}
		
	},
	socket: {
		Pusher: {
			app_id: "105",
			app_key: "472a6812d",
			app_secret: "d462a",
			useTLS: true,
			cluster: "eu"
		},
	},
	email: {
		Mailgun: {
			'api': {
				'endpoint': 'api.eu.mailgun.net',
				'version': 'v3',
				'ssl': true
			},
			'from': {
				'address': 'mail@noreply.dineorder.com',
				'name': 'RedoQ',
			},
			force_from_address: false,
			app_key: "6e4eaac",
			public_api_key: 'pubkey',
			domain: 'noreply.dineorder.com',
		},
	},
	push_notification: {
		firebase: {
			url: "https://fcm.googleapis.com/fcm/send",
			key_app: "muysb51fhrUa_",
		},
		onesignal: {
			url: "https://onesignal.com/api/v1/notifications",
			key_app: {
				key: "muysb51fhrUa_",
				app_id: "e237",
				android_channel_id: "d9f72"
			}
		}
	},
	apiurl: {
		webservice: "https://webservice.redoq.com"
	},
	payment_gateway: {
		stripe: {
			PROD: {
				payment_gateway_Code: '1003',
				publishable_key: "pk",
				secret_key: "sk",
				api_url: "https://api.stripe.com"
			},
			DEV: {
				payment_gateway_Code: '1003',
				publishable_key: "pk",
				secret_key: "sk",
				api_url: "https://api.stripe.com"
			}
		},
	},
	payment_gateway_alias: {
		'Stripe India': 'stripeIN'
	},
	awssdk: {
		DEV: {
			
		},
		PROD: {
			
		}
	},
	defaults: {
		sms: {
			loginOtp: "thesmsworks-transactional"
		},
		socket: {
			orders: "Pusher"
		}
	}
}; 