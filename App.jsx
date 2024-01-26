import { 
	useEffect, 
	useState 
} from "react";
import { 
	StyleSheet, 
	Platform, 
	PermissionsAndroid,
	Alert, 
	BackHandler,
	Text, 
	View, 
	Pressable,
	ActivityIndicator
} from "react-native";
import BluetoothSerial from "react-native-bluetooth-serial";

const deviceMacAddress = "00:22:09:02:68:3E";
const naturalNotes = [
	{
		"code": "a",
		"letter": "C"
	},
	{
		"code": "c",
		"letter": "D"
	},
	{
		"code": "e",
		"letter": "E"
	},
	{
		"code": "f",
		"letter": "F"
	},
	{
		"code": "h",
		"letter": "G"
	},
	{
		"code": "j",
		"letter": "A"
	},
	{
		"code": "l",
		"letter": "B"
	}
];
const accidentalNotes = [
	{
		"code": "b",
		"letter": "C#"
	},
	{
		"code": "d",
		"letter": "D#"
	},
	{
		"code": "g",
		"letter": "F#"
	},
	{
		"code": "i",
		"letter": "G#"
	},
	{
		"code": "k",
		"letter": "A#"
	},
];

const writeCode = async (code) => {
	try {
		await BluetoothSerial.write(code);
	} catch (error) {
		console.warn(error);
	}
}

export default function App() {
	const [isLoading, setLoading] = useState(false);
	const [isPermissionsGranted, setPermissionsGranted] = useState(false);
	const [isBluetoothEnabled, setBluetoothEnabled] = useState(false);
	const [connectedDevice, setConnectedDevice] = useState(null);
	
	const checkPermissions = async () => {
		try {
			if (Platform.OS == "android" && Platform.Version <= 30) {
				const locationGranted = await PermissionsAndroid.check(
					PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
				);
				if (!locationGranted) {
					const locationResult = await PermissionsAndroid.request(
						PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
					);
					if (locationResult === PermissionsAndroid.RESULTS.GRANTED) {
						console.log("Uygulama icin gerekli izinler verildi.");
						setPermissionsGranted(true);
					} else {
						Alert.alert(
							"Gerekli izinler verilmedi!",
							"Uygulamanin dogru calismasi icin lutfen gerekli izinleri verin.",
							[
								{
									text: "Tamam",
									onPress: BackHandler.exitApp
								},
							]
						);
					}
				}
			}
		} catch (error) {
			console.warn(error);
		}
	}
	
	const checkBluetoothEnabled = async () => {
		try {
			setLoading(true);
			const initialBluetoothState = await BluetoothSerial.isEnabled();
			if (!initialBluetoothState) {
				await BluetoothSerial.requestEnable();
				setBluetoothEnabled(true);
				setLoading(false);
			} else {
				setBluetoothEnabled(true);
				setLoading(false);
			}
		} catch (error) {
			setBluetoothEnabled(false);
			setLoading(false);
			Alert.alert(
				"Bluetooth kapali!",
				"Uygulamanin dogru calismasi icin Bluetooth acik olmalidir.",
				[
					{
						text: "Tamam",
						onPress: BackHandler.exitApp
					}
				]
			);
			console.warn(error);
		}
	}
	
	const connectToDevice = async (device) => {
		try {
			setLoading(true);
			await BluetoothSerial.connect(device.id);
			setConnectedDevice(device);
			setLoading(false);
			Alert.alert(
				"HC-06 modul ile baglanti kuruldu!",
				"",
				[
					{
						text: "Tamam",
					}
				]
			);
		} catch (error) {
			setConnectedDevice(null);
			setLoading(false);
			Alert.alert(
				"HC-06 modul ile baglanti kurulamadi!",
				"Eslesmis modul ile baglanti kurulamadi. Lutfen modulun calistigindan emin olun.",
				[
					{
						text: "Tamam",
						onPress: BackHandler.exitApp
					}
				]
			);
			console.warn(error);
		}
	}
	
	const searchForDevice = async () => {
		try {
			if (connectedDevice && connectedDevice.id == deviceMacAddress) {
				console.log("Modul baglantisi mevcut.");
				return;
			}
			if (isBluetoothEnabled) {
				setLoading(true);
				const pairedDevices = await BluetoothSerial.list();
				for (const device of pairedDevices) {
					if (device.id === deviceMacAddress) {
						setLoading(false);
						Alert.alert(
							"Eslesmis HC-06 modul bulundu!",
							"Telefon ile eslesmis HC-06 modul bulundu. Baglanti kurulsun mu?",
							[
								{
									text: "Hayir",
									onPress: BackHandler.exitApp
								},
								{
									text: "Evet",
									onPress: () => connectToDevice(device)
								}
							]
						);
					} else {
						setLoading(false);
						Alert.alert(
							"Eslesmis HC-06 modul bulunamadi!",
							"Lutfen modulun telefon ile eslendiginden emin olun ve tekrar deneyin.",
							[
								{
									text: "Tamam",
									onPress: BackHandler.exitApp
								}
							]
						);
					}
				}
			}
		} catch (error) {
			console.warn(error);
		}
	}

	useEffect(() => {
		checkPermissions();
		checkBluetoothEnabled();
		searchForDevice();
	}, [isPermissionsGranted, isBluetoothEnabled]);

	return (
		<View style={styles.container}>
			{isLoading ? <Spinner /> : null}
			<TopBar />
			<PianoKeyboard />
		</View>
	);
}

function Spinner() {
	return (
		<View style={styles.spinnerContainer}>
			<ActivityIndicator size="large" style={styles.spinner} />
		</View>
	);
}

function TopBar() {
	return (
		<View style={styles.topBar}>
			<Text style={styles.topBarText}>Arduino Mini Piano</Text>
		</View>
	);
}

function PianoKeyboard() {
	const accidentalKeys = accidentalNotes.map((note) => 
		<PianoKeyAccidental 
			letter={note.letter} 
			handler={() => writeCode(note.code)} 
		/>
	);
	const naturalKeys = [];
	let accidentalIndex = 0;
	for (const note of naturalNotes) {
		if (note.letter != "E" && note.letter != "B") {
			naturalKeys.push(
				<PianoKeyNatural 
					letter={note.letter} 
					handler={() => writeCode(note.code)} 
					children={accidentalKeys[accidentalIndex]}
				/>
			);
			accidentalIndex++;
		} else {
			naturalKeys.push(
				<PianoKeyNatural
					letter={note.letter} 
					handler={() => writeCode(note.code)}
				/>
			);
		}
	}
	return (
		<View style={styles.keyboard}>
			{naturalKeys}
		</View>
	);
} 

function PianoKeyNatural({ letter, handler, children }) {
	return (
		<View style={styles.keyNatural}>
			<Pressable onPress={handler}>
				<Text style={styles.keyNaturalText}>{letter}</Text>
			</Pressable>
			{children}
		</View>
	);
}

function PianoKeyAccidental({ letter, handler }) {
	return (
		<Pressable style={styles.keyAccidental} onPress={handler}>
				<Text style={styles.keyAccidentalText}>{letter}</Text>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		flexDirection: "row-reverse",
		zIndex: 0,
	},
	spinnerContainer: {
		alignItems: "center",
		justifyContent: "center",
		position: "absolute",
		zIndex: 1,
		top: 0,
		right: 0,
		bottom: 0,
		left: 0,
	},
	spinner: {
		height: "10%",
		width: "20%",
		backgroundColor: "white",
		elevation: 5,
	},
	topBar: {
		flex: 1,
		flexGrow: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "black",
		borderStyle: "solid",
		borderColor: "gray",
		borderLeftWidth: 2,
	},
	topBarText: {
		width: 180,
		color: "white",
		fontSize: 18,
		transform: [{rotate: "90deg"}],
	},
	keyboard: {
		flex: 1,
		flexGrow: 9,
		flexDirection: "column",
		justifyContent: "flex-start",
		zIndex: 0,
	},
	keyNatural: {
		flex: 1,
		justifyContent: "center",
		alignItems: "flex-start",
		position: "relative",
		zIndex: 0,
		backgroundColor: "white",
		borderStyle: "solid",
		borderWidth: 1,
		borderColor: "#000000",
	},
	keyNaturalText: {
		marginLeft: 30,
		fontSize: 30,
		color: "black",
		transform: [{rotate: "90deg"}],
	},
	keyAccidental: {
		height: "50%",
		width: "65%",
		justifyContent: "center",
		alignItems: "flex-start",
		position: "absolute",
		marginTop: 100,
		bottom: 0,
		right: 0,
		zIndex: 1,
		backgroundColor: "black",
	},
	keyAccidentalText: {
		marginLeft: 10,
		fontSize: 20,
		color: "white",
		transform: [{rotate: "90deg"}],
	}
});