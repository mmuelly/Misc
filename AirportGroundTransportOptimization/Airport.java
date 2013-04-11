import java.io.*;

public class Airport {

    private int MAX;      // maximum # of nodes = # of gates + 20;

    public int GATES;     // number of gates
    public int NODES;     // number of nodes; i.e., N - G = # of storage facilities
    public int[][] time;  // time[i][j] is 0, if j <= i; and travel time, if j > i
    public int[] wheels;  // number of wheel chairs at node i
    public int[] escort;  // number of escorts at node i
    public int[] type;    // node type: 0 - Gate No Storage, 1 - Gate Storage, 2 - Dedicated Storage

    // Constructor
    public Airport(BufferedReader file) {
        try {
            GATES = (new Integer(file.readLine())).intValue();
            NODES = GATES;
            MAX = GATES + 20;
            time = new int[MAX][MAX];
            wheels = new int[MAX];
            escort = new int[MAX];
            type = new int[MAX];
            for (int i = 0; i < MAX; ++i) {
                for (int j = 0; j < MAX; ++j) {
                    if (j <= i || i >= GATES || j >= GATES) time[i][j] = 0;
                    else time[i][j] = (new Double(file.readLine())).intValue();
                }
                wheels[i] = 0;
                escort[i] = 0;
                type[i] = 0;
            }
        } catch (Exception e) {}
    }

    // Error safe method to find travel time.
    public int time(int i, int j) {
        if (j > i) return time[i][j];
        return time[j][i];
    }

}
