const FRONTEND_HOSTING = Object.freeze({
	SIMPLE: "simple",
	PROD: "prod",
});

function normalizeFrontendHosting(value) {
	const normalized = String(value || "")
		.trim()
		.toLowerCase();
	if (!normalized) {
		return FRONTEND_HOSTING.SIMPLE;
	}
	if (Object.values(FRONTEND_HOSTING).includes(normalized)) {
		return normalized;
	}
	throw new Error(
		`Unsupported FRONTEND_HOSTING '${value}'. Expected 'simple' or 'prod'.`,
	);
}

function isSimpleFrontendHosting(value) {
	return normalizeFrontendHosting(value) === FRONTEND_HOSTING.SIMPLE;
}

function isProdFrontendHosting(value) {
	return normalizeFrontendHosting(value) === FRONTEND_HOSTING.PROD;
}

function getFrontendResources({ projectId, resourcePrefix }) {
	return {
		frontendBucket: `${projectId}-${resourcePrefix}-frontend`,
		negName: `${resourcePrefix}-backend-neg`,
		backendServiceRes: `${resourcePrefix}-backend-service`,
		backendBucketRes: `${resourcePrefix}-frontend-bucket`,
		urlMapName: `${resourcePrefix}-url-map`,
		httpProxyName: `${resourcePrefix}-http-proxy`,
		forwardingRuleName: `${resourcePrefix}-fwd-rule`,
		httpsProxyName: `${resourcePrefix}-https-proxy`,
		httpsForwardingRuleName: `${resourcePrefix}-fwd-rule-https`,
		sslCertificateName: `${resourcePrefix}-ssl-cert`,
	};
}

function getFrontendUrl({ frontendHosting, frontendIp, backendUrl }) {
	if (isSimpleFrontendHosting(frontendHosting)) {
		return backendUrl || "(same as backend Cloud Run URL)";
	}
	return frontendIp
		? `http://${frontendIp}  (or your custom domain if configured)`
		: "(load balancer IP pending)";
}

module.exports = {
	FRONTEND_HOSTING,
	normalizeFrontendHosting,
	isSimpleFrontendHosting,
	isProdFrontendHosting,
	getFrontendResources,
	getFrontendUrl,
};
