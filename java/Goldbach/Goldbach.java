import java.io.*;
import java.lang.Math.*;

public class Goldbach {
	public static void main(String[] args) { 

		int startNumber = 4;

try {


File srcFile = new File("Goldbach.txt"); 
BufferedReader in = new BufferedReader(new FileReader(srcFile)); 
String text = in.readLine(); 

				String lastOne = "";
				while (in.ready())
				{
                                        // Print file line to screen
					lastOne = in.readLine();
				}

				System.out.println(lastOne);
				String [] test = lastOne.split(";");
				startNumber = Integer.parseInt(test[0]);			
				System.out.println(startNumber);

				in.close();
			} 
                        catch (Exception e)
			{
				System.err.println("File input error");
			}





/*		System.out.print("Please enter number to test: ");

		int testNumber=0;
		try {
		BufferedReader stdin = new BufferedReader (new InputStreamReader(System.in));
		String input = stdin.readLine();
		testNumber = Integer.parseInt( input );
		} 
		catch(Exception e) {}

		if(testNumber % 2 != 0) {
			System.out.println("Please enter an even number");
			System.exit(0);
		}
			

		System.out.print("");
*/

		int testNumber=0;
		int count=0;

// for file output
FileOutputStream out;
PrintStream p;
try {
out = new FileOutputStream("Goldbach.txt", true);
p = new PrintStream(out);
//


Timer timing = new Timer();
timing.start();

for(int k = startNumber + 2;k < 100000000; k = k +2) {//for(int k = 4;k < 100000000; k = k +2) {
		
		testNumber = k;
		count = 0;

if((k % 1000) == 0) {
	timing.end();
	System.out.println(k + ": " + (-1*timing.startTime));
	timing.start();
}
	




		//System.out.println(testNumber + ":");

		for(int i=3;i <= (testNumber/2);i = i+2) {
			if( isPrime(i) && isPrime(testNumber - i) ) {
				//System.out.println(testNumber + ";" + i + ";" + (testNumber-i));
				//System.out.println("= " + (testNumber-i) + " + " + i);
				count++;
			}
		}

		//System.out.println("Unique representations: " + count);
		p.println(testNumber + ";" + count); // Write this to file
		//System.out.println("");




}

	
// file block
p.close();
}
catch(Exception e) {}
//



	}



// Sieve of erastothenes => O(n(log n)log log n) 
	public static boolean isPrime(int number) {

		double test = number;

		if(number % 2 == 0) {
			return false;
		}	

		for(int i = 3; i <= Math.sqrt(test);i=i+2) {
			if(number % i == 0) {
				return false;
			}
		}
		return true;
	}


}