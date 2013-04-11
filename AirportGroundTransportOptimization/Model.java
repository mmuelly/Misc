import java.io.*;

public class Model {

    public static void main(String[] args) {
        if (args.length == 0) {
            System.out.println("Usage: Model airport.txt");
            return;
        }

        Airport airport;
        BufferedReader file = null;
        
        try {
            file = new BufferedReader(new FileReader(new File(args[0])));
        } catch (Exception e) {}

        airport = new Airport(file);

       for (int i = 0; i < airport.NODES; ++i) {
            for (int j = 0; j < airport.NODES; ++j) {
                System.out.print("" + airport.time[i][j] + "\t");
            }
            System.out.println();
        }

System.out.println(	airport.time(1,2));


    }

}
