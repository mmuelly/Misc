import java.util.*;
import java.io.*;
import java.lang.Math;

public class Simulate {

	public static void main(String[] args) {
     		if (args.length == 0) {
            		System.out.println("Usage: Model airport.txt");
            		return;
        	}
			Simulate main = new Simulate(args[0]);
	}


	Simulate(String afile) {

	int numFlights = 100;
	int numGates = 14;
	int passPerFlight = 109;
	int numEscorts = 8;
	double percentDisabled = 0.01;
	Vector totalStatistics= new Vector();

        Airport airport;
        BufferedReader file = null;
        
        try {
        	file = new BufferedReader(new FileReader(new File(afile)));
file.mark(10);
	        numGates = (new Integer(file.readLine())).intValue();
file.reset();
        airport = new Airport(file);

// Prepare to write to output file
			FileWriter dest = new FileWriter( afile + ".out", false );
			PrintWriter output = new PrintWriter( dest, true );


// Vary pecentDisabled
for(percentDisabled=0.01; percentDisabled <= 0.05; percentDisabled=percentDisabled+0.01) {


// Vary flights
for(int flights=100; flights <= 400; flights=flights+100) {
numFlights = flights;

numEscorts=0;
int lastDelay=-1;

// Number of escorts
while( lastDelay != 0 ) {
numEscorts++;
// for(int d=1; d < 10; d++) {


for(int i=0; i < 100;i++) {
	totalStatistics.addElement( createSchedule(numFlights,numGates,passPerFlight,numEscorts,percentDisabled,airport) );
}

int delay=0;
for(int i=0; i < totalStatistics.size();i++) {
	delay = delay + ((DataTracker) totalStatistics.elementAt(i)).totalDelay;

}
//	System.out.println( "Total delay: " + delay );
//	System.out.println( "Size: " + totalStatistics.size() );
//	System.out.println( "Average delay per sample: " + delay/totalStatistics.size() );
int maxdelay=0;
for(int i=0; i < totalStatistics.size();i++)
	if(((DataTracker) totalStatistics.elementAt(i)).totalDelay > maxdelay)
	maxdelay = ((DataTracker) totalStatistics.elementAt(i)).totalDelay;
// Stdev
double mean=0;
mean = delay/totalStatistics.size();
double stdev=0;
for(int i=0; i < totalStatistics.size();i++) 
	stdev = stdev + (((DataTracker) totalStatistics.elementAt(i)).totalDelay - mean)*(((DataTracker) totalStatistics.elementAt(i)).totalDelay - mean);
stdev=Math.sqrt(stdev/totalStatistics.size());


	int totdis=0;
for(int i=0; i < totalStatistics.size();i++)
	totdis = totdis + ((DataTracker) totalStatistics.elementAt(i)).totalDisabled;
//	System.out.println("Average Total Disabled per sample: " + totdis/totalStatistics.size() );
	int avepass=0;
for(int i=0; i < totalStatistics.size();i++)
	avepass = avepass + (((new Double( ((DataTracker) totalStatistics.elementAt(i)).averagePassengers)).intValue()));
//	System.out.println("Average Passengers per plane: " + avepass/totalStatistics.size() );

output.println("[G=" + numGates + ",E=" + numEscorts + ",F=" + numFlights + " D=" + percentDisabled + "]	AD=" + delay/totalStatistics.size() + " SD=" + stdev + " TD=" + delay + " MaxDel=" + maxdelay + " AveDis=" + totdis/totalStatistics.size() + " AvePass=" + avepass/totalStatistics.size() );

// Efficiency is not calculated correctly
//for(int i=0; i < totalStatistics.size();i++)
//	tot = tot + (((new Double( ((DataTracker) totalStatistics.elementAt(i)).averageEfficiency))).intValue());
//	System.out.println("Average efficiency: " + tot/totalStatistics.size() );

	totalStatistics.removeAllElements();
lastDelay = delay;
}

// End Vary flights
}
output.flush();
// endVary pecentDisabled
}
output.close();
// Try ends here
        } catch (Exception e) {}
	}

	public DataTracker createSchedule(int numFlights, int numGates, int passPerFlight, int numEscorts, double percentDisabled, Airport myairport) {
		Vector sched = new Vector();
		Vector tasks = new Vector();
		Random dist = new Random();
		int n;
		DataTracker stat = new DataTracker();

		// Generate flight times
		for(int i=1; i < numFlights; i++) {

//			n = (new Double( dist.nextGaussian()  *120)).intValue()+920; // Gaussian distribution
			n = dist.nextInt(1440); // Uniform distribution
//			while( n < 0 || n > 1440 ) {
//				//n =(new Double( dist.nextGaussian() *120 )).intValue()+920; // Gaussian distribution
//			}
			
			sched.add( new Flights() );
			( (Flights) sched.elementAt(i-1) ).ATime=n;
		}

		// Generate disabled people per flight
		double rand=0;
		int pass=0;
		for(int i=1; i < numFlights; i++) {
			rand = Math.abs( dist.nextGaussian() + 3);
			pass = (new Long(Math.round( rand * passPerFlight / 3)).intValue());
			n = (new Long(Math.round( rand * percentDisabled *passPerFlight / 3)).intValue());
			while( n < 0 || n > 10 ) {
				rand = Math.abs( dist.nextGaussian()+1 );
				pass = (new Double( rand+1 * passPerFlight)).intValue();
				n =(new Double( rand+1 * percentDisabled * passPerFlight)).intValue();
			}
			( (Flights) sched.elementAt(i-1) ).DisabledPeople=n;
			( (Flights) sched.elementAt(i-1) ).Passengers=pass;
		}

		
		// Generate length of stay at gate
		for(int i=1; i < numFlights; i++) {
			( (Flights) sched.elementAt(i-1) ).GTime = dist.nextInt(15)+45;
			( (Flights) sched.elementAt(i-1) ).DTime = ( (Flights) sched.elementAt(i-1) ).ATime + ( (Flights) sched.elementAt(i-1) ).GTime;

		}

////////
		sched = sort(sched);

		// Assign Gates
		int [] gates = new int[numGates];
		for(int i=0; i < numGates; i++) {
			gates[i] = -1;
		}

		int j = 1;
		boolean freeGates =false;
		for(int i=0; i < 1441; i++) {

			for(int g=0; g < numGates; g++) {
				if(gates[g] == i) 
					gates[g] = -1;
			}
				
					

			if( ((Flights) sched.elementAt(j-1)).ATime == i ) {

				while( ((Flights) sched.elementAt(j-1)).ATime == i ) {

					freeGates=false;



					for(int g=0; g < numGates; g++) {
						if(gates[g] == i) {
							gates[g] = -1;
}
						if(gates[g] == -1)
							freeGates=true;
					}

					if(freeGates==false) {

						for(int k=1; k < numFlights; k++) {
							if( ((Flights) sched.elementAt(k-1)).ATime == i && ((Flights) sched.elementAt(k-1)).AGate == -1) {

								((Flights) sched.elementAt(k-1)).ATime = i+1;
}

						}
					}
					else {
					int g = dist.nextInt(numGates);
					while( gates[g] != -1) {
						g = dist.nextInt(numGates);
					}
					if(j < numFlights-1) {
						((Flights) sched.elementAt(j-1)).AGate = g;
						gates[g] = ((Flights) sched.elementAt(j-1)).ATime + ((Flights) sched.elementAt(j-1)).GTime;
						freeGates=false;						j++;
					}
					else {
						((Flights) sched.elementAt(j-1)).AGate = g;
						gates[g] = ((Flights) sched.elementAt(j-1)).ATime + ((Flights) sched.elementAt(j-1)).GTime;
						i=1442;

					}
					}
				}

			}
		}

// Catch unassigned gates
for(int i=0; i < sched.size(); i++) {
	if( ( (Flights) sched.elementAt(i) ).AGate == -1)
		( (Flights) sched.elementAt(i) ).AGate = 1;
}

// Assign departing flights

		Vector departureSchedule = new Vector();
		departureSchedule = sortDTime(sched);
		for(int i=1; i < numFlights;i++) {
			for(int l=0; l < ((Flights) sched.elementAt(i-1)).DisabledPeople; l++) {

				tasks.add( new Routes() );
				( (Routes) tasks.elementAt(tasks.size()-1) ).ATime=((Flights) sched.elementAt(i-1)).ATime;
				( (Routes) tasks.elementAt(tasks.size()-1) ).AGate=((Flights) sched.elementAt(i-1)).AGate;
				// Select minimum time between flights
				int min = dist.nextInt(75)+45;
				// Select some departing flight
				boolean noMoreFlights = true;
				for( int m = 1; m < numFlights; m++) {
					if( ((Flights) departureSchedule.elementAt(m-1)).DTime > ( (Routes) tasks.elementAt(tasks.size()-1) ).ATime + min && ( (Routes) tasks.elementAt(tasks.size()-1) ).DTime == -1 ) {
						( (Routes) tasks.elementAt(tasks.size()-1) ).DTime=((Flights) sched.elementAt(m-1)).DTime;
						( (Routes) tasks.elementAt(tasks.size()-1) ).DGate=((Flights) sched.elementAt(m-1)).AGate;
						( (Routes) tasks.elementAt(tasks.size()-1) ).departingFlight=((Flights) sched.elementAt(m-1));

						noMoreFlights = false;
					}
				}
				if(noMoreFlights == true)
					tasks.removeElementAt(tasks.size()-1);

			}
		}

// Catch unassigned gates
for(int i=0; i < tasks.size(); i++) {
	if( ( (Routes) tasks.elementAt(i) ).DGate == -1)
		( (Routes) tasks.elementAt(i) ).DGate = 1;
}

	stat.totalDisabled = tasks.size();

// Assign times for completing the routes
int last=0;
//try {
	for(int i=1; i < tasks.size();i++) { 
		last = i;
		((Routes) tasks.elementAt(i-1)).travelCost = myairport.time( ((Routes) tasks.elementAt(i-1)).AGate,((Routes) tasks.elementAt(i-1)).DGate);
//System.out.println( ((Routes) tasks.elementAt(i-1)).travelCost  );
	}		
//}
//catch(Exception e) { 
// };//System.out.println( ((Routes) tasks.elementAt(last-1)).AGate + ":" + ((Routes) tasks.elementAt(last-1)).DGate); }


// Notification times
	for(int i=1; i < tasks.size();i++) { 
		((Routes) tasks.elementAt(i-1)).NTime = ((Routes) tasks.elementAt(i-1)).ATime - 15;
		((Routes) tasks.elementAt(i-1)).timeAvailable = ((Routes) tasks.elementAt(i-1)).DTime - ((Routes) tasks.elementAt(i-1)).ATime - ((Routes) tasks.elementAt(i-1)).travelCost;
	}	


// Create Escorts
	Vector Escorts = new Vector();
	for(int i=0; i < numEscorts;i++) {
		Escorts.addElement( new Escort() );
	}



/*
for(int i=1; i < tasks.size();i++) {
System.out.println("Arrival Time: " + ((Routes) tasks.elementAt(i-1)).ATime + " Arrival Gate: " + ((Routes) tasks.elementAt(i-1)).AGate + " Departure Time: " + ((Routes) tasks.elementAt(i-1)).DTime + " Departure Gate: " + ((Routes) tasks.elementAt(i-1)).DGate + " Travel time: " + ((Routes) tasks.elementAt(i-1)).travelCost);



//			System.out.println( ((Flights) sched.elementAt(i-1)).ATime );
//			System.out.println( ((Flights) sched.elementAt(i-1)).DisabledPeople );
//			System.out.println( ((Flights) sched.elementAt(i-1)).AGate );
		}
*/


// Assign Tasks to escorts
	tasks = sortRoutes(tasks);
while( tasks.size() > 0 ) {
// Next available escort
	int avail = ( (Escort) Escorts.elementAt(0)).availability;
	int escortNum = 0;
	for(int i=0; i < numEscorts;i++) {
		if( ( (Escort) Escorts.elementAt(i)).availability < avail ) { 
			avail = ( (Escort) Escorts.elementAt(i)).availability;
			escortNum = i;
		}
	}

// Assign next task to next available escort
	( (Escort) Escorts.elementAt(escortNum)).queue.addElement( ( (Routes) tasks.elementAt(0) ) );
	( (Escort) Escorts.elementAt(escortNum)).availability =  ( (Routes) tasks.elementAt(0) ).DTime + ( (Routes) tasks.elementAt(0) ).travelCost; // Add travelcost to account for time after dropping off passenger
	tasks.removeElementAt(0);

}


// Very nice.... now check if any of the escorts are causing delays!
for(int i =0; i < Escorts.size();i++) {

	Vector oneEscort = new Vector();
	oneEscort = (Vector) (((Escort) Escorts.elementAt(i)).queue);
	int timeTracker =0;
	((Escort) Escorts.elementAt(i)).efficiency = 0;
	timeTracker = ( (Routes) oneEscort.elementAt(0) ).DTime;
	for(int o=0; o<oneEscort.size();o++) {
		if( ( (Routes) oneEscort.elementAt(o) ).DTime + ( (Routes) oneEscort.elementAt(o) ).travelCost > timeTracker ) {
			timeTracker = ( (Routes) oneEscort.elementAt(o) ).DTime + ( (Routes) oneEscort.elementAt(o) ).travelCost;
		}
		else {
			int originalTime = timeTracker;
			timeTracker = timeTracker + ( (Routes) oneEscort.elementAt(o) ).travelCost;
			((Escort) Escorts.elementAt(i)).delay = ((Escort) Escorts.elementAt(i)).delay + (timeTracker - ( (Routes) oneEscort.elementAt(o) ).DTime);

			((Escort) Escorts.elementAt(i)).efficiency = ((Escort) Escorts.elementAt(i)).efficiency + ( (Routes) oneEscort.elementAt(o) ).travelCost*2;
		}

	}
}

/*
Vector test = new Vector();
for (int i=0;i < Escorts.size();i++) {
	test = (Vector) (((Escort) Escorts.elementAt(i)).queue);
	System.out.println();
	System.out.println();
	System.out.println();	System.out.println();
	System.out.println();
	System.out.println();	System.out.println();
	System.out.println();
	System.out.println("Escort " + i);
	for (int o=0;o<test.size();o++)
		System.out.println( ( (Routes) test.elementAt(o) ).DTime );

	System.out.println("Total Delay: " + ((Escort) Escorts.elementAt(i)).delay );
}
*/



// Get Average number of passengers per flight
int tot=0;
for(int i=0;i < sched.size();i++)
	tot = tot + ((Flights) sched.elementAt(i)).Passengers;
stat.averagePassengers = tot/sched.size();	
// Calculate total delay
for(int i=0;i < Escorts.size();i++)
	stat.totalDelay = stat.totalDelay + ((Escort) Escorts.elementAt(i)).delay;
for(int i=0;i < Escorts.size();i++)
	stat.averageEfficiency = stat.averageEfficiency + ((Escort) Escorts.elementAt(i)).efficiency;
stat.averageEfficiency = stat.averageEfficiency/Escorts.size();
//System.out.println(stat.averageEfficiency);

//System.out.println(stat.totalDelay);
		return stat;
	}


// Sorts a vector by the Atime
	public Vector sort(Vector elements) {

		Flights element1;
		Flights element2;
		Flights tempelement;
		int min, d;

		for(int c=0;c < elements.size()-1;c++) {

			for(d = c;d < elements.size();d++) {

				element1 = ( (Flights) elements.elementAt(c) );
				element2 = ( (Flights) elements.elementAt(d) );
				if( element1.ATime > element2.ATime ) {
					tempelement = element1;
					element1 = element2;
					element2 = tempelement;
				}
					elements.setElementAt(element1,c);
					elements.setElementAt(element2,d);
			}

            	}

		return(elements);
	}

// Sorts a vector by the Atime
	public Vector sortDTime(Vector elements) {

		Flights element1;
		Flights element2;
		Flights tempelement;
		int min, d;

		for(int c=0;c < elements.size()-1;c++) {

			for(d = c;d < elements.size();d++) {

				element1 = ( (Flights) elements.elementAt(c) );
				element2 = ( (Flights) elements.elementAt(d) );
				if( element1.DTime > element2.DTime ) {
					tempelement = element1;
					element1 = element2;
					element2 = tempelement;
				}
					elements.setElementAt(element1,c);
					elements.setElementAt(element2,d);
			}

            	}

		return(elements);

	}

// Sorts Routes by DTime
	public Vector sortRoutes(Vector elements) {

		Routes element1;
		Routes element2;
		Routes tempelement;
		int min, d;

		for(int c=0;c < elements.size()-1;c++) {

			for(d = c;d < elements.size();d++) {

				element1 = ( (Routes) elements.elementAt(c) );
				element2 = ( (Routes) elements.elementAt(d) );
				if( element1.DTime > element2.DTime ) {
					tempelement = element1;
					element1 = element2;
					element2 = tempelement;
				}
					elements.setElementAt(element1,c);
					elements.setElementAt(element2,d);
			}

            	}

		return(elements);

	}

}

