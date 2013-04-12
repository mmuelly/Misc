public class Routes {

		int ATime;
		int AGate;
		int DTime = -1;
		int DGate;
		int NTime; // notification time in minutes, ie ATime - NTime
		int travelCost; // cost ("time") to get from A Gate to D Gate
		int timeAvailable;
		Flights departingFlight; // to keep track of delay cost
}
