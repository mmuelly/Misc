// ***********************************************
// Michael C. Muelly, 2004
// ***********************************************

// This is the actual simulation file

// If the program runs out of stack size run it with the following command
// # javac -Xss5m Assig2
// where 5m could be an even higher value
// Note that this does not seem to work under Windows while it does in a Unix environment

// The data is printed out on the screen as comma-separated values. This allows easy import in a spreadsheet application.

import java.util.*;
import java.io.*;


public class StabilitySort {

	int M = 50; // Standard M value; The base M value can be adjusted to actual needs, it determines the size of array to sort

	int [] sizes = { 1, 2, 4, 8, 16, 32 };	// Contains the multipliers that will be used with M
	int [] algorithms = {0,1,2,3,4,5};		// The numbers of the algorithms

	/* Algorithms:
		0: Quicksort
		1: Quicksort with median of three
		2: Quicksort with median of three and insertion if < 10
		3: Insertion
		4: Mergesort
		5: Dynamic quicksort
	*/

	public static void main(String[] args) {

		StabilitySort main = new StabilitySort();

	}

	StabilitySort() {

		// Ask user for an M size
		int size = M;
		String input = "";
		try {
			BufferedReader stdin = new BufferedReader( new InputStreamReader( System.in ) );
			System.out.println("Please enter a value for M or press enter for default: ");
			input = stdin.readLine();
			size = ( Integer.parseInt( input ) );
		} 
		catch(Exception e) {
			size = M;
		}
		M = size;
		System.out.println("M: " + M + "\n");


		SortAlg sort = new SortAlg();		// Initialize the sorting class
		Timer timer = new Timer();		// Initialize the timer
		int L;
		int [] sortarray = new int[1];
		Random randGen;


		System.out.println("Algorithm;List Size;PP value;Ave. Time ");	// The information that will be printed about the simulation


		for( int o = 0; o < algorithms.length; o++ ) {		// Loop for each algorithm

			for( int j = 0; j < sizes.length; j++ ) {		// Loop for each array size value (=L)

				L = M * sizes[j];

				for( int p = 0; p < 3; p++) {		// Loop for each kind of data (0: Random, 1: Sorted, 2: Sorted backwards)

					// If p==1, fill the array with sorted data
					// It won't be changed by the algorithms, so only need to do once


					timer.reset(); // Reset timer before the 5 runs
				
					// Run every setup five times
					for(int k = 0; k < 5; k++) {
						// Generate new random data and fill the array if p == 0
						if( p == 0) {
							randGen = new Random();		// Random(long seed) for reproducible testing
							sortarray = new int[L];
							for(int i = 0; i < sortarray.length; i++)
								sortarray[i] = randGen.nextInt(1073741824);
						}
						else if( p == 1) {
							sortarray = new int[L];
							for(int i = 0; i < sortarray.length; i++) {
								sortarray[i] = i+1;
							}
						}
						// Refill the backward sorted data if p == 2
						else if( p == 2) {
							sortarray = new int[L];
							for(int i = 0; i < sortarray.length; i++) {
								sortarray[i] = sortarray.length-i;
							}
						}

						// Call the appropriate algorithm for the run
						// Note that the sentinel is inserted BEFORE the timer is started and removed after the timer stops
						// This gives us a more accurate measurement
						if( algorithms[o] == 0) {
							sortarray = sort.insertsentinel(sortarray,0);
							timer.start();
							sort.quicksort(sortarray,0,sortarray.length-1);
							timer.stop();
							sortarray = sort.removesentinel(sortarray,0);
						}

						// Call the appropriate algorithm for the run
						// No sentinel is needed here
						else if( algorithms[o] == 1) {
							timer.start();
							sort.medof3(sortarray,0,sortarray.length-1);
							timer.stop();
						}

						// Call the appropriate algorithm for the run
						// No sentinel is needed here
						else if( algorithms[o] == 2) {
							timer.start();
							sort.quickandinsert(sortarray,0,sortarray.length-1);
							timer.stop();
						}

						// Call the appropriate algorithm for the run
						// Note that the sentinel is inserted BEFORE the timer is started and removed after the timer stops
						// This gives us a more accurate measurement
						else if( algorithms[o] == 3) {
							sortarray = sort.insertsentinel(sortarray,0);
							timer.start();
							sort.insertion(sortarray,sortarray.length-1);
							timer.stop();
							sortarray = sort.removesentinel(sortarray,0);
						}

						// Call the appropriate algorithm for the run
						// No sentinel is needed here
						else if( algorithms[o] == 4) {
							timer.start();
							sort.mergesort(sortarray,0,sortarray.length-1);
							timer.stop();

						}

						// Call the appropriate algorithm for the run
						// Note that the sentinel is inserted BEFORE the timer is started and removed after the timer stops
						// This gives us a more accurate measurement
						else if( algorithms[o] == 5) {
							sortarray = sort.insertsentinel(sortarray,0);
							timer.start();
							sort.dynquick(sortarray,0,sortarray.length-1);
							timer.stop();
							sortarray = sort.removesentinel(sortarray,0);
						}

					}
					// After five runs of the configuration, print out the setup and the average runtime of the algorithm
					System.out.println( algorithms[o] + ";" + L + ";" + p + ";" + (timer.report()/5) );


				}


			}

		}
	
		// At the end print out the numbers of the algorithms
		System.out.println("Algorithms:\n0: Quicksort\n1: Quicksort with median of three\n2: Quicksort with median of three and insertion if < 10\n3: Insertion\n4: Mergesort\n5: Dynamic quicksort\n");
	}

}
