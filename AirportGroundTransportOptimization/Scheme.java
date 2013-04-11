public class Scheme {

    private Airport airport;

    public int WHEELS = 0;
    public int ESCORTS = 0;
    public int SNODES = 0;
    public int SNODESCAP = 0;
    public int SGATES = 0;
    public int SGATESCAP = 0;

    public GenSchedule schedule;
    public int clock = 0;

    public Scheme(Airport air) {
        airport = air;
    }

    public boolean init(int W,        // Number of Wheel Chairs
                        int E,        // Number of Escort Shifts
                        int SN,       // Number of Storage Nodes
                        int SNCAP,    // Capacity of Storage Nodes
                        int SG,       // Number of Storage Gates
                        int SGCAP,    // Storage Capacity
                        GenSchedule sched) {  // Passenger Schedule
        WHEELS = W;
        ESCORTS = E;
        SNODES = SN;
        SNODESCAP = SNCAP;
        SGATES = SG;
        SGATESCAP = SGCAP;

        // Alter Airport Accordingly

        clock = 0;

        return true;
    }

    public boolean update() {
        // Do stuff with sched

        if (clock == 1439) return false;
        ++clock;
        return true;
    }

}