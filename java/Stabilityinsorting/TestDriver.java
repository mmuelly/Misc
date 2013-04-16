// ***********************************************
// Michael C. Muelly
// ***********************************************

import java.util.*;
import java.io.*;


public class TestDriver {

	public static void main(String[] args) {

		TestDriver main = new TestDriver();

	}

	TestDriver() {

		SortAlg sort = new SortAlg();
		int size = 0;
		String input = "10";			// Standard size

		// Read array size from user
		try {
			BufferedReader stdin = new BufferedReader( new InputStreamReader( System.in ) );
			System.out.println("Please enter the array size: ");
			input = stdin.readLine();
			size = ( Integer.parseInt( input ) );
		} 
		catch(Exception e) {
			size = 10;
		}
		System.out.println("Array size: " + size);
		
	
		// Generate random data and assign it to arrays
		int [] sortarray = new int[size];
		Random randGen = new Random();
		for(int i = 0; i < sortarray.length; i++) {
			sortarray[i] = randGen.nextInt(1073741824);
		}
		int [] alg0 = new int[size];
		int [] alg1 = new int[size];
		int [] alg2 = new int[size];
		int [] alg3 = new int[size];
		int [] alg4 = new int[size];
		int [] alg5 = new int[size];
		for (int c = 0; c < sortarray.length; c++) {
			alg0[c] = sortarray[c];
			alg1[c] = sortarray[c];
			alg2[c] = sortarray[c];
			alg3[c] = sortarray[c];
			alg4[c] = sortarray[c];
			alg5[c] = sortarray[c];
		}

		// Insert sentinel and call quicksort algorithm
		alg0 = sort.insertsentinel(alg0,0);
		sort.quicksort(alg0,0,alg0.length-1);
		alg0 = sort.removesentinel(alg0,0);

		// Call median of three quicksort
		sort.medof3(alg1,0,alg1.length-1);

		// Call median of three and insertion sort quicksort
		sort.quickandinsert(alg2,0,alg2.length-1);

		// Insert sentinel and call insertion sort
		alg3 = sort.insertsentinel(alg3,0);
		sort.insertion(alg3,alg3.length-1);
		alg3 = sort.removesentinel(alg3,0);
	
		// Call mergesort
		sort.mergesort(alg4,0,alg4.length-1);

		// Insert sentinel and call dynamic quicksort
		alg5 = sort.insertsentinel(alg5,0);
		sort.dynquick(alg5,0,alg5.length-1);
		alg5 = sort.removesentinel(alg5,0);

		// Print out random and sorted arrays
		System.out.println("Random Data: ");
		sort.printArray(sortarray);
		System.out.println("\n");

		System.out.println("Quicksort: ");
		sort.printArray(alg0);
		System.out.println("\n");

		System.out.println("Quicksort with median of 3: ");
		sort.printArray(alg1);
		System.out.println("\n");

		System.out.println("Quicksort with median of 3 and insertion sort if > 10 ");
		sort.printArray(alg2);
		System.out.println("\n");

		System.out.println("Insertion Sort: ");
		sort.printArray(alg3);
		System.out.println("\n");

		System.out.println("Merge Sort: ");
		sort.printArray(alg4);
		System.out.println("\n");

		System.out.println("Dynamic Quicksort: ");
		sort.printArray(alg5);
		System.out.println();


	}

}