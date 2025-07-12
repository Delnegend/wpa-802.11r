// index.js

/**
 * Represents an Access Point with a name and MAC address.
 * @typedef {object} AccessPoint
 * @property {string} name - The name of the access point.
 * @property {string} mac_addr - The MAC address of the access point.
 */

/**
 * Generates a random hexadecimal string of a specified length.
 * @param {number} length - The desired length of the hex string (in bytes, so actual string length will be double).
 * @returns {string} A random hexadecimal string.
 */
function randomHex(length) {
	const bytes = new Uint8Array(length);
	crypto.getRandomValues(bytes); // Fills the array with random values
	return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates the configuration based on the input MAC addresses and selected format.
 * @returns {string} The formatted configuration string.
 */
function generateConfig() {
	/** @type {string} */
	// @ts-ignore
	const macAddressesInput = document.getElementById('macAddresses')?.value;
	/** @type {string} */
	// @ts-ignore
	const format = document.querySelector('input[name="outputFormat"]:checked')?.value;

	// Parse MAC addresses from textarea, filtering out empty lines
	const rawMacs = macAddressesInput.split('\n').map(line => line.trim()).filter(line => line !== '');

	/** @type {AccessPoint[]} */
	const aps = rawMacs.map((mac, index) => ({
		name: `AP ${index + 1}`, // Simple naming for generated APs
		mac_addr: mac
	}));

	if (aps.length === 0) {
		return "Please enter at least one MAC address to generate configuration.";
	}

	// Generate global parameters
	const password = randomHex(16); // 16 bytes = 32 hex characters
	const mobilityDomain = randomHex(2); // 2 bytes = 4 hex characters

	let outputPrefix = "";
	let outputSeparator = "";
	let r0khOutput = [];
	let r1khOutput = [];

	if (format === 'uci') {
		outputPrefix = 'uci set wireless.@wifi-iface[{}].'; // Placeholder for index, will be replaced later
		outputSeparator = '=';
	} else if (format === 'config') {
		outputPrefix = '\toption ';
		outputSeparator = ' ';
	}

	// Prepare r0kh and r1kh lists
	for (const ap of aps) {
		const macNoColons = ap.mac_addr.replace(/:/g, '');
		r0khOutput.push(`${ap.mac_addr},${macNoColons},${password}`);
		r1khOutput.push(`${ap.mac_addr},${ap.mac_addr},${password}`);
	}

	let fullConfigOutput = "";

	// Generate config for each AP
	aps.forEach((ap, index) => {
		// For UCI format, we need to specify the correct index for the wifi-iface
		const currentPrefix = format === 'uci' ? outputPrefix.replace('{}', index.toString()) : outputPrefix;
		const nasid = ap.mac_addr.replace(/:/g, '');

		fullConfigOutput += `Config for ${ap.name} (MAC: ${ap.mac_addr}):\n\n`;
		fullConfigOutput += `${currentPrefix}ieee80211r${outputSeparator}'1'\n`;
		fullConfigOutput += `${currentPrefix}ft_psk_generate_local${outputSeparator}'0'\n`;
		fullConfigOutput += `${currentPrefix}max_inactivity${outputSeparator}'15'\n`;
		fullConfigOutput += `${currentPrefix}dtim_period${outputSeparator}'3'\n`;
		fullConfigOutput += `${currentPrefix}ft_over_ds${outputSeparator}'0'\n`;
		fullConfigOutput += `${currentPrefix}reassociation_deadline${outputSeparator}'20000'\n`;
		fullConfigOutput += `${currentPrefix}ieee80211w${outputSeparator}'2'\n`;
		fullConfigOutput += `${currentPrefix}mobility_domain${outputSeparator}'${mobilityDomain}'\n`;
		fullConfigOutput += `${currentPrefix}pmk_r1_push${outputSeparator}'1'\n`;
		fullConfigOutput += `${currentPrefix}nasid${outputSeparator}'${nasid}'\n`;
		fullConfigOutput += `${currentPrefix}r1_key_holder${outputSeparator}'${nasid}'\n`;
		fullConfigOutput += `${currentPrefix}macaddr${outputSeparator}'${ap.mac_addr}'\n`;

		if (format === 'uci') {
			fullConfigOutput += `${currentPrefix}r0kh${outputSeparator}'${r0khOutput.join(',')}'\n`;
			fullConfigOutput += `${currentPrefix}r1kh${outputSeparator}'${r1khOutput.join(',')}'\n`;
		} else if (format === 'config') {
			r0khOutput.forEach(item => {
				fullConfigOutput += `\tlist r0kh '${item}'\n`;
			});
			r1khOutput.forEach(item => {
				fullConfigOutput += `\tlist r1kh '${item}'\n`;
			});
		}
		fullConfigOutput += '\n'; // Add a newline for separation between AP configs
	});

	return fullConfigOutput;
}

/**
 * Updates the output display with the generated configuration.
 */
function updateOutput() {
	const outputResultElement = document.getElementById('outputResult');
	if (outputResultElement) outputResultElement.textContent = generateConfig();
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
	const macAddressesTextarea = document.getElementById('macAddresses');
	const formatRadios = document.querySelectorAll('input[name="outputFormat"]');

	// Add example MAC addresses
	if (macAddressesTextarea) {
		// @ts-ignore
		macAddressesTextarea.value = "11:22:33:44:55:66\nAA:BB:CC:EE:DD:FF";

		// Listen for input changes in the textarea
		macAddressesTextarea.addEventListener('input', updateOutput);
	}

	// Listen for changes in the radio buttons
	formatRadios.forEach(radio => {
		radio.addEventListener('change', updateOutput);
	});

	// Initial generation of config on page load
	updateOutput();
});
