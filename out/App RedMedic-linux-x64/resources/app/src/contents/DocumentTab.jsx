import React from "react";
import { message, Button, Layout } from 'antd';

import RecordSection from "./RecordSection.jsx";
import ImageResource from "./ImageResource.jsx";
const Web3 = require("web3");
var categories = ["allergies", "labs", "procedures", "immunizations", "medications", "conditions", "images"];
var possibleDates = ["performedDatePeriod","performedPeriod","recordedDate", "date", "dateRecorded","effectiveDateTime", "effectiveTimeDate", "dateWritten","performedDateTime"];
const mphrAbi = '[{"constant":false,"inputs":[{"internalType":"bytes32","name":"name","type":"bytes32"}],"name":"deletePPHR","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"internalType":"bytes32","name":"name","type":"bytes32"}],"name":"getPPHR","outputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"},{"internalType":"bytes32","name":"","type":"bytes32"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"acta","outputs":[{"internalType":"contract Acta","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"gateways","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"actaAddr","outputs":[{"internalType":"address payable","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"id","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"bytes32","name":"name","type":"bytes32"},{"internalType":"address","name":"addr","type":"address"},{"internalType":"bytes32","name":"section","type":"bytes32"}],"name":"revokeAccess","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"pphrAddr","type":"address"}],"name":"newPPHR","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"returnGateways","outputs":[{"internalType":"bytes32[]","name":"","type":"bytes32[]"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"bytes32","name":"name","type":"bytes32"},{"internalType":"address","name":"addr","type":"address"},{"internalType":"bytes32","name":"section","type":"bytes32"},{"internalType":"uint256","name":"nHours","type":"uint256"}],"name":"grantAccess","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"_id","type":"bytes32"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"}]';

function hex2a(hexx) {
    var hex = hexx.toString();//force conversion
    var str = '';
    for (var i = 0; (i < hex.length && hex.substr(i, 2) !== '00'); i += 2)
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    return str;
}

function compare(resourceA, resourceB) {
	let a = resourceA["date"];
	let b = resourceB["date"];
	let d = a.split("-")[0];
	let m = a.split("-")[1];
	let y = a.split("-")[2];
	let totalDaysA = parseInt(d) + parseInt(m)*30 + parseInt(y)*365;
	d = b.split("-")[0];
	m = b.split("-")[1];
	y = b.split("-")[2];
	let totalDaysB = parseInt(d) + parseInt(m)*30 + parseInt(y)*365;
	return (totalDaysA < totalDaysB ? 1 : -1);
}

function getDate(resource) {
	for(var i = 0; i < possibleDates.length; i++) {
		if(resource.hasOwnProperty(possibleDates[i])) {
			let date = null;
			if(i <= 1) { date = resource[possibleDates[i]]["end"]; }
			else { date = resource[possibleDates[i]]; }
			let d = date.split("-")[0];
			if(d.length == 1) { d = "0"+d; }
			let m = date.split("-")[1];
			if(m.length == 1) { m = "0"+m; }
			let y = date.split("-")[2].slice(0,4);
			return d+"-"+m+"-"+y;
		}
	}
}

function getSummary(resource) {
	let type = resource.resourceType;
	if(type === "AllergyIntolerance") return resource.substance+"  -  "+resource.status;
	else if(type === "Condition") return resource.code.coding[0].display+"  -  "+resource.clinicalStatus;
	else if(type === "Immunization") return resource.vaccineCode.text+"  -  "+resource.status;
	else if(type === "Observation") return resource.code.text+"  -  "+resource.valueQuantity.value+" "+resource.valueQuantity.unit;
	else if(type === "MedicationOrder") return resource.medicationReference;
	else if(type === "Procedure") return resource.code.text+"  -  "+resource.status;
	else if(type === "Image") return resource.notes;
}

export default class DocumentTab extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			view: "all",
			prevView: "all",
			personalData: {},
			labs: [],
			medications: [],
			allergies: [],
			procedures: [],
			immunizations: [],
			conditions: [],
			images: []
		};
	}

	componentDidMount() {
		this.getData();
	}

	addData(data, gateway) {
		//manually identify providers, not good but it's just alpha version
		let provider = "Clínica Corachan";
		if(gateway == "0.0.0.0:5001")  provider = "Hospital el Pilar";
		else if(gateway == "0.0.0.0:5002")  provider = "Centro Médico Teknon";
		var that = this;

		categories.forEach(function (category) {
			let list = [];
			for(let i = 0; i < data[category].length; i++) {
				let resource = data[category][i];
				resource["provider"] = provider;
				resource["date"] = getDate(resource);
				resource["summary"] = getSummary(resource);
				list.push(resource);
			}
			//we sort by dates
			let newState = that.state;
			newState[category] = newState[category].concat(list);
			newState[category].sort(compare);
			that.setState({ state:newState });
		});

		if(this.state.personalData.hasOwnProperty("display") === false) {
			this.setState({personalData:data["personalData"]});
		}
		console.log("Data successfully fetched from gateway "+ gateway);
	}

	fetchUrl(url) {
		return new Promise(function (resolve,reject) {
			var xhr = new XMLHttpRequest();
			xhr.open("GET", url, true);
			xhr.onload = function() {
				var status = xhr.status;
				if(status > 400 || status == 200) {
					const response = JSON.parse(xhr.responseText);
					if(status != 200 || response.hasOwnProperty("ErrorMessage")) {
						message.error("An error ocurred when querying url: "+ url + ", error response is: " + response["ErrorMessage"]);
						reject(status);
					} else {
						resolve(response["data"]);
					}
				} else { //Unknown error
					reject(status);
				}
			};
			xhr.send();
		});
	}

	async request(gateway, id, category) {
		try {
			let sig = this.props.profile.wallet.signData("nonce");
			let url = "http://"+gateway+"/nonce/"+sig;
			const nonce = await this.fetchUrl(url);

			const message = id + "," + category + "," + nonce.toString();
			sig = this.props.profile.wallet.signData(message);
			url = "http://"+gateway+"/patient/"+id+"&"+category+"&"+nonce+"&"+sig;
			const data = await this.fetchUrl(url);
			this.addData(data, gateway);
		} catch(exception) {
			console.log("Exception ocurred:", exception);
		}
	}

	//returns all the data from every single pphr
	async getData() {
		//first we have to find out all the gateways we have to query
		var that = this;
		let web3 = new Web3(new Web3.providers.HttpProvider("https://rinkeby.infura.io"));
		let mphr = new web3.eth.Contract(JSON.parse(mphrAbi));
		mphr.options.address = this.props.profile.mphr;

		mphr.methods.returnGateways().call({}, function (error, result) {
			if(error) { throw (error); }
			for(var i = 0; i < result.length; i++) {
				let gateway = hex2a(result[i]).slice(1);
				that.request(gateway, that.props.profile.id, "all");
			}
		});
	}

	changeView(newView) {
		this.setState({prevView:this.state.view,view:newView});
		window.scrollTo(0,0);
	}

	returnContent() {
		if(this.state.view === "all") {
			let sections = [];
			for(var i = 0; i < categories.length; i++) {
				if(this.state[categories[i]].length === 0) continue;
				sections.push(<RecordSection key={categories[i]} section={categories[i]} data={this.state[categories[i]]} individual={false} changeView={(newView) => this.changeView(newView)} />);
			}
			return sections;
		} else if(this.state.view.split(":")[0] === "image") {
			let ind = this.state.view.split(":")[1];
			let content = this.state.images[ind];
			return (<ImageResource content={content} prev={this.state.prevView} changeView={() => this.changeView(this.state.prevView)}/>);
		} else {
			let cat = this.state.view;
			if(categories.indexOf(cat) !== -1) {
				return (<RecordSection section={cat} data={this.state[cat]} individual={true} changeView={(newView) => this.changeView(newView)} />);
			} else {
				return (<div>Full record only!</div>);
			}
		}
	}

	render() {
		//not until we have data
		if(this.state.personalData.hasOwnProperty("display") === false) {
			setTimeout(
				function() {
				  document.getElementById('div1').style.display='none';
				  document.getElementById('div2').style.display='none';
				}, 5000);
			return (<div style={{marginLeft:"50vw",marginTop:"250px"}} className="lds-ripple"><div></div><div></div></div>);
		}
		let changeView = "";
		if(this.props.onlyProvider !== "") {
			changeView = (
				<div>
					<div style={{width:"100%",marginTop:"5px",height:"5px"}}></div>
					<Button type="danger" style={{width:"98%",marginLeft:"1%", height:"30px",border:"0.5px solid #F08080"}} onClick={() => this.props.changeView()}>Back</Button>
				</div>
			);
		}
		return (
			<Layout style={{marginLeft:"210px"}}>
				{this.returnContent()}
				{changeView}
			</Layout>
		);
	}
}